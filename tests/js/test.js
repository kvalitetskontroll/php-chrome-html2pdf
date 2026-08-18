import chai from 'chai'
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
            chai.expect(await converter.run()).to.be.instanceof(Buffer);
        });
    });

    describe('_setHtml', () => {
        it('passes a custom timeout through to page.setContent()', async () => {
            const converter = new Converter('<p>Hello</p>', {});
            let receivedOptions;
            const fakePage = {
                setContent: async (html, options) => {
                    receivedOptions = options;
                },
            };

            await converter._setHtml(fakePage, '<p>Hello</p>', {timeout: 900000});

            chai.expect(receivedOptions).to.deep.equal({
                waitUntil: ['load', 'networkidle0'],
                timeout: 900000,
            });
        });

        it('omits timeout from page.setContent() options when none was given', async () => {
            const converter = new Converter('<p>Hello</p>', {});
            let receivedOptions;
            const fakePage = {
                setContent: async (html, options) => {
                    receivedOptions = options;
                },
            };

            await converter._setHtml(fakePage, '<p>Hello</p>', {});

            chai.expect(receivedOptions).to.deep.equal({
                waitUntil: ['load', 'networkidle0'],
            });
        });
    });

});