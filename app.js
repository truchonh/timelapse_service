const fs = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');
const { CronJob } = require('cron');

const DAY_MS = 1000 * 3600 * 24;
const CAMERA_FILE_PATH = path.join(__dirname, 'images');
const TMP_DIR = path.join(__dirname, 'images', 'tmp');
const TIMELAPSE_FIR = path.join(__dirname, 'timelapse');

const directoryFilter = (name) => /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/gi.test(name);
const imageFilter = (name) => /^[0-9]{2}-[0-9]{2}-[0-9]{2}(\.jpg)$/gi.test(name);

const timelapseJob = new CronJob('0 1 13 * * *', async () => {
    const start = new Date(new Date().getTime() - DAY_MS);
    start.setHours(13, 0, 0);
    const end = new Date();
    end.setHours(13, 0, 0);

    try {
        await run(start, end);
    } catch (err) {
        console.error(err);
    }
});
timelapseJob.start();

async function run(start, end, outputNameOverride) {
    if (!start || !end) {
        throw new Error('Missing start and/or end date.');
    }

    await initDirectories();
    const files = await scanFiles();

    await prepareImages(files, start, end);

    const outputName = `${outputNameOverride || start.toLocaleDateString('fr-CA')}.mp4`;
    await runFfmpeg(TMP_DIR, path.join(TIMELAPSE_FIR, outputName));

    await cleanupTempFiles();
}
module.exports.run = run;

async function initDirectories() {
    try {
        await fs.mkdir(TMP_DIR);
    } catch(_err) {
        console.log(_err);
    }
}

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

async function prepareImages(files, startDate, endDate) {
    const selectedFiles = files.filter(file => {
        const start = startDate.getTime();
        const end = endDate.getTime();
        const fileDate = file.date.getTime();
        return start <= fileDate && fileDate < end;
    });
    selectedFiles.sort((a, b) => {
        const aTime = a.date.getTime();
        const bTime = b.date.getTime();
        if (aTime < bTime) {
            return -1;
        } else if (aTime > bTime) {
            return 1;
        }
        return 0;
    });
    
    let index = 0;
    for (const file of selectedFiles) {
        const name = `${index.toString().padStart(6, '0')}.jpg`;
        await fs.copyFile(file.path, path.join(TMP_DIR, name));
        index++;
    }
}

function runFfmpeg(imagePath, outputPath) {
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

async function cleanupTempFiles() {
    await fs.rm(TMP_DIR, { recursive: true });
}
