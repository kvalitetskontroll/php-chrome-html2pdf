/**
 * This file is part of the spiritix/php-chrome-html2pdf package.
 *
 * @copyright Copyright (c) Matthias Isler <mi@matthias-isler.ch>
 * @license   MIT
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';

const defaultOptions = {};
const defaultLaunchOptions = {
        acceptInsecureCerts: true,
        headless: true,
        args: [
                '--no-sandbox',
                '--disable-web-security',
                '--font-render-hinting=none',
                '--proxy-server="direct://"',
                '--proxy-bypass-list=*',
            ]
        };

class Converter
{
    constructor(html, options, launchOptions)
    {
        this.html = html;
        this.options = options;
        this.launchOptions = launchOptions;
    }

    getDefaultOptions()
    {
        return defaultOptions;
    }

    getOptions()
    {
        return Object.assign({}, defaultOptions, this.options);
    }

    getLaunchOptions()
    {
        if(this.launchOptions.length === 0) {
            return defaultLaunchOptions;
        }
        return this.launchOptions;
    }

    async run()
    {
        const browser = await this._launchBrowser();
        const page = await this._initPage(browser);
        const buffer = await this._convert(page);

        await this._close(browser);

        return buffer;
    }

    async _launchBrowser()
    {
        return puppeteer.launch(this.getLaunchOptions());
    }

    async _initPage(browser)
    {
        return browser.newPage();
    }

    async _convert(page)
    {
        let options = this.getOptions();
        if (options.hasOwnProperty('mediaType')) {
            await page.emulateMediaType(options.mediaType);
            delete options.mediaType;
        }
        if (options.hasOwnProperty('viewport')) {
            await page.setViewport(options.viewport);
            delete options.viewport;
        }
        if (options.hasOwnProperty('cookies')) {
            await page.setCookie(...options.cookies);
            delete options.cookies;
        }

        await this._setHtml(page, this.html, options);

        if (options.hasOwnProperty('pageWaitFor')) {
            await new Promise(resolve => setTimeout(resolve, parseInt(options.pageWaitFor)));
            delete options.pageWaitFor;
        }

        if (options.hasOwnProperty('height')) {
            if(options.height === 'auto'){
                options.height = await page.evaluate(() => document.body.scrollHeight);
            }
        }

        return this._getPdf(page, options)
    }

    async _setHtml(page, html, options = {})
    {
        // The HTML is written to a temp file and navigated to instead of page.setContent():
        // setContent() + waitUntil "networkidle0" never resolves on large documents (e.g. ~28MB of
        // HTML with hundreds of inline base64 images). Chromium emits the "networkIdle" lifecycle
        // event before the "init" event of the document.write()-ed document, Puppeteer discards it
        // on "init" and it is never emitted again, so the conversion dies on the timeout although
        // the page finished loading seconds earlier. Waiting for "load" is enough: it fires once
        // every stylesheet, script and image (inline or fetched) has loaded.
        const navigationOptions = {
            waitUntil: 'load'
        };

        // `timeout` is meant to bound the whole conversion (see the `timeout` option in the
        // README), but page loading and page.pdf() each have their own independent Puppeteer
        // timeout with its own 30s default.
        if (options.hasOwnProperty('timeout')) {
            navigationOptions.timeout = options.timeout;
        }

        const tmpFile = path.join(os.tmpdir(), `html2pdf-${process.pid}-${Date.now()}.html`);

        fs.writeFileSync(tmpFile, html);

        try {
            return await page.goto(pathToFileURL(tmpFile).href, navigationOptions);
        } finally {
            fs.unlinkSync(tmpFile);
        }
    }

    async _getPdf(page, options)
    {
        return page.pdf(options);
    }

    async _close(browser)
    {
        return browser.close();
    }
}

export default Converter;
