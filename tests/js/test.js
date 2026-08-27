import chai from 'chai'
import fs from 'fs';
import { fileURLToPath } from 'url';
import Converter from '../../lib/Converter.js';

describe('Converter', () => {

    describe('getDefaultOptions', () => {
        it('returns an object', () => {
            const converter = new Converter('', {});
            chai.assert.isObject(converter.getDefaultOptions());
        });
    });

    describe('getOptions', () => {
        it('returns the merged options object', () => {
            const options = {printBackground: false, landscape: true};
            const converter = new Converter('', options);

            chai.expect(converter.getOptions()).to.deep.equal(
                Object.assign({}, converter.getDefaultOptions(), options)
            );
        });
    });

    describe('run', () => {
        it('returns a buffer', async () => {
            const converter = new Converter('<p>Hello</p>', {}, []);
            // page.pdf() returns a Uint8Array since Puppeteer 22 (a Buffer is one too)
            chai.expect(await converter.run()).to.be.instanceof(Uint8Array);
        });
    });

    describe('_setHtml', () => {
        const fakePage = (calls) => ({
            goto: async (url, options) => {
                calls.push({url, options, fileExistedDuringLoad: fs.existsSync(fileURLToPath(url))});
            },
        });

        it('navigates to a temp file containing the HTML and waits for "load"', async () => {
            const converter = new Converter('<p>Hello</p>', {});
            const calls = [];

            await converter._setHtml(fakePage(calls), '<p>Hello</p>', {});

            chai.expect(calls).to.have.lengthOf(1);
            chai.expect(calls[0].url).to.match(/^file:\/\/.*\.html$/);
            chai.expect(calls[0].fileExistedDuringLoad).to.equal(true);
            chai.expect(calls[0].options).to.deep.equal({waitUntil: 'load'});
        });

        it('passes a custom timeout through to the navigation', async () => {
            const converter = new Converter('<p>Hello</p>', {});
            const calls = [];

            await converter._setHtml(fakePage(calls), '<p>Hello</p>', {timeout: 900000});

            chai.expect(calls[0].options).to.deep.equal({waitUntil: 'load', timeout: 900000});
        });

        it('removes the temp file after loading, also when the navigation fails', async () => {
            const converter = new Converter('<p>Hello</p>', {});
            let url;
            const failingPage = {
                goto: async (gotoUrl) => {
                    url = gotoUrl;
                    throw new Error('navigation failed');
                },
            };

            let error;
            try {
                await converter._setHtml(failingPage, '<p>Hello</p>', {});
            } catch (e) {
                error = e;
            }

            chai.expect(error.message).to.equal('navigation failed');
            chai.expect(fs.existsSync(fileURLToPath(url))).to.equal(false);
        });

        it('converts a large document with hundreds of inline images', async function () {
            // Regression test: with page.setContent() + "networkidle0" this never resolved.
            this.timeout(120000);

            const image = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
            const filler = 'x'.repeat(120 * 1024);
            let html = '<html><body>';
            for (let i = 0; i < 220; i++) {
                html += `<img src="${image}"><!-- ${filler} -->`;
            }
            html += '</body></html>';

            const converter = new Converter(html, {timeout: 60000}, []);
            const pdf = await converter.run();

            chai.expect(pdf).to.be.instanceof(Uint8Array);
            chai.expect(Buffer.from(pdf.slice(0, 4)).toString()).to.equal('%PDF');
        });
    });

});