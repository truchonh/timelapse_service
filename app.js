const path = require('path');
const fs = require('fs/promises');
const { CronJob } = require('cron');
const dayjs = require('dayjs');
const { TMP_DIR, TIMELAPSE_DIR } = require('./constants');
const { 
    cleanupTempFiles, 
    initDirectories, 
    prepareImages, 
    combineImages, 
    scanFiles,
    listVideoChunks,
    combineVideos,
} = require('./videoProcessing');

// Run every hour
const everyHour = '0 0 * * * *';
const timelapseJob = new CronJob(everyHour, async () => {
    const start = dayjs().subtract(1, 'hour').startOf('hour');
    const end = start.clone().add(1, 'hour');

    try {
        await run(start, end);
    } catch (_err) {
    }
});
timelapseJob.start();

async function run(start, end, outputNameOverride) {
    console.log(start.format('YYYY-MM-DD_HH[:00]'));

    if (!start || !end) {
        throw new Error('Missing start and/or end date.');
    }

    await initDirectories();
    const files = await scanFiles();

    await prepareImages(files, start, end);

    const outputName = `${outputNameOverride || start.format('YYYY-MM-DD_HH[00]')}.mp4`;
    await combineImages(TMP_DIR, path.join(TIMELAPSE_DIR, outputName));

}
module.exports.run = run;

const everyDayAtMidnight = '0 0 0 * * *';
const _job = async () => {
    await initDirectories();

    const videoLists = await listVideoChunks();
    for (const { date, files } of videoLists) {
        const listPath = path.join(TMP_DIR, 'list.txt');
        await fs.writeFile(
            listPath,
            files.map(file => path.join(TIMELAPSE_DIR, file)).join('\n'),
            { encoding: 'utf-8' }
        );
        await combineVideos(listPath, path.join(TIMELAPSE_DIR, date.format('YYYY-MM-DD[.mp4]')));
        await Promise.all(
            files.map(file => fs.rm(path.join(TIMELAPSE_DIR, file)))
        );
    }

    await cleanupTempFiles();
};
const combineDailyVideos = new CronJob(everyDayAtMidnight, _job);
combineDailyVideos.start();
