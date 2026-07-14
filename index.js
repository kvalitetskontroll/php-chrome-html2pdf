/**
 * This file is part of the spiritix/php-chrome-html2pdf package.
 *
 * @copyright Copyright (c) Matthias Isler <mi@matthias-isler.ch>
 * @license   MIT
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import getStdin from 'get-stdin';
import { program } from 'commander';
import Converter from './lib/Converter.js';

(async () => {
    program
        .option('-o, --options [options]', 'PDF options for puppeteer')
        .option('-l, --launchOptions [launchOptions]', 'Launch Options for puppeteer')
        .parse()

    const options = JSON.parse(program.opts().options);
    const launchOptions = JSON.parse(program.opts().launchOptions);

    const converter = new Converter(await getStdin(), options, launchOptions);
    const result = await converter.run();

    // page.pdf() may return a Buffer or a plain Uint8Array/TypedArray depending on the
    // puppeteer version; normalize to a real Buffer so it's written out as raw binary
    // rather than being coerced through a lossy string conversion.
    process.stdout.write(Buffer.from(result));
})();