const fs = require('fs/promises');
const path = require('path');
const dayjs = require('dayjs');
const { spawn } = require('child_process');
const { sortBy, chain } = require('lodash');
const { rimraf } = require('rimraf');
const { CAMERA_FILE_PATH, TMP_DIR, TIMELAPSE_DIR } = require('./constants');

const directoryFilter = (name) => /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/gi.test(name);
const imageFilter = (name) => /^[0-9]{2}-[0-9]{2}-[0-9]{2}(\.jpg)$/gi.test(name);
const videoChunkFilter = (name) => /^[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9-_]*(\.mp4)$/gi.test(name);

async function initDirectories() {
    try {
        await fs.mkdir(TMP_DIR);
    } catch(err) {
        console.error(err);
    }
}
module.exports.initDirectories = initDirectories;

async function scanFiles() {
    const files = [];
    const daysDirectories = await fs.readdir(CAMERA_FILE_PATH);
    for (const dayDirectory of daysDirectories.filter(directoryFilter)) {
        const [year, month, day] = dayDirectory.split('-');
        let baseDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        const fileNames = await fs.readdir(path.join(CAMERA_FILE_PATH, dayDirectory));
        for (const file of fileNames.filter(imageFilter)) {
            const info = path.parse(file);
            const [hour, minute, second] = info.name.split('-');
            const fileDate = new Date(baseDate.getTime());
            fileDate.setHours(parseInt(hour), parseInt(minute), parseInt(second));
            files.push({
                date: fileDate,
                path: path.join(CAMERA_FILE_PATH, dayDirectory, file),
            });
        }
    }
    return files;
}
module.exports.scanFiles = scanFiles;

async function prepareImages(files, startDate, endDate) {
    const selectedFiles = files.filter(file => {
        const start = startDate.valueOf();
        const end = endDate.valueOf();
        const fileDate = file.date.getTime();
        return start <= fileDate && fileDate < end;
    });
    
    let index = 0;
    for (const file of sortBy(selectedFiles, (file) => file.date.valueOf())) {
        const name = `${index.toString().padStart(6, '0')}.jpg`;
        await fs.copyFile(file.path, path.join(TMP_DIR, name));
        index++;
    }
}
module.exports.prepareImages = prepareImages;

function combineImages(imagePath, outputPath) {
    const ffmpeg = spawn('ffmpeg', [
        '-framerate', '30', 
        '-i', path.join(imagePath, '%06d.jpg'), 
        '-s:v', '1280x720',
        '-c:v', 'libx264',
        '-crf', '17',
        '-pix_fmt', 'yuv420p',
        outputPath
    ]);
    ffmpeg.stdout.on('data', (data) => {
        console.log(data.toString());
    });
    ffmpeg.stderr.on('data', (data) => {
        console.error(data.toString());
    });
    return new Promise((resolve) => {
        ffmpeg.on('close', resolve);
    });
}
module.exports.combineImages = combineImages;

async function cleanupTempFiles() {
    await rimraf(TMP_DIR);
}
module.exports.cleanupTempFiles = cleanupTempFiles;

async function listVideoChunks() {
    const videoFiles = await fs.readdir(TIMELAPSE_DIR);
    const videoChunksByDays = chain(videoFiles)
        .filter(videoChunkFilter)
        .sortBy(fileName => {
            const [_dateStr, timeStr] = fileName.split('_');
            return timeStr;
        })
        .groupBy(fileName => {
            const [dateStr] = fileName.split('_');
            return dateStr;
        })
        .value();

    const videoLists = [];
    for (let [dateStr, videoFiles] of Object.entries(videoChunksByDays)) {
        const groupDate = dayjs(dateStr).startOf('day');
        if (groupDate.isBefore(dayjs(), 'day')) {
            videoLists.push({
                date: groupDate,
                files: videoFiles,
            });
        }
    }
    return videoLists;
}
module.exports.listVideoChunks = listVideoChunks;

function combineVideos(listFilePath, outputPath) {
    const ffmpeg = spawn('ffmpeg', [
        '-f', 'concat', 
        '-safe', '0',
        '-i', listFilePath, 
        '-c', 'copy',
        outputPath
    ]);
    ffmpeg.stdout.on('data', (data) => {
        console.log(data.toString());
    });
    ffmpeg.stderr.on('data', (data) => {
        console.error(data.toString());
    });
    return new Promise((resolve, reject) => {
        ffmpeg.on('close', (code) => {
            if (code === 0) {
                resolve(0);
            } else {
                reject(code);
            }
        });
    });
}
module.exports.combineVideos = combineVideos;
