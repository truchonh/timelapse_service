const { program } = require('commander');
const { run } = require('./app');
const dayjs = require('dayjs');

program
    .name('timelapse-creator')
    .description('Create timelapse from ip cam still pictures');
program.command('run')
    .requiredOption('--time <hh:mm>')
    .option('--end <hh:mm>')
    .action(async (options) => {
        const start = dayjs();
        const [startHour, startMinute] = options.time.split(':');
        start.hour(startHour +0);
        start.minute(startMinute +0);

        const end = dayjs();
        if (options.end) {
            const [endHour, endMinute] = options.end.split(':');
            end.hour(endHour +0);
            end.minute(endMinute +0);
        }

        await run(start, end, start.format('YYYY-MM-DD') + '_' + Date.now());

        process.exit(0);
    });

program.parse();


