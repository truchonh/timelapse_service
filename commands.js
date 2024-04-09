const { program } = require('commander');
const { run } = require('./app');

program
    .name('timelapse-creator')
    .description('Create timelapse from ip cam still pictures');
program.command('run')
    .requiredOption('--time <hh:mm>')
    .option('--end <hh:mm>')
    .action(async (options) => {
        const start = new Date();
        const [startHour, startMinute] = options.time.split(':');
        start.setHours(startHour, startMinute, 0);

        const end = new Date();
        if (options.end) {
            const [endHour, endMinute] = options.end.split(':');
            end.setHours(endHour, endMinute, 0);
        }

        await run(start, end, start.toLocaleDateString('fr-CA') + '_' + Date.now());

        process.exit(0);
    });

program.parse();


