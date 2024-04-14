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
        console.log(options);
    
        let start = dayjs();
        const [startHour, startMinute] = options.time.split(':');
        start = start.hour(parseInt(startHour));
        start = start.minute(parseInt(startMinute));

        let end = dayjs();
        if (options.end) {
            const [endHour, endMinute] = options.end.split(':');
            end = end.hour(parseInt(endHour));
            end = end.minute(parseInt(endMinute));
        }

        await run(start, end, start.format('YYYY-MM-DD') + '_' + Date.now());

        process.exit(0);
    });

program.parse();


