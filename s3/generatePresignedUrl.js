var AWS = require('aws-sdk');

const S3_PUBLIC_IMAGES_ACCESS_KEY_ID = 'AKIAJVPEUUAVZLLPSIAA';
const S3_PUBLIC_IMAGES_SECRET_ACCESS_KEY = '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';

const s3 = new AWS.S3({
    region: "eu-west-1",
    signatureVersion: "v4",
    accessKeyId: S3_PUBLIC_IMAGES_ACCESS_KEY_ID,
    secretAccessKey: S3_PUBLIC_IMAGES_SECRET_ACCESS_KEY,
});

const generatePresignedUrlForImages = async function (type, name) {
    const type = (type).replace('image/', '');
    let name = name.replace(`.${type}`, '');
    while (name != name.replace(' ', '_')) name = name.replace(' ', '_');
    this.info(`s3, generating new presigned url for ${name} ${type} image`);
    const key = `${name}_${Date.now()}_${uuid()}.${type}`;

    return s3.getSignedUrl(
        'putObject',
        {
            Bucket: '"crowd-sourcing"',
            ContentType: req.body.type,
            Key: key
        },
        (err, url) => {
            if (err) {
                this.error(`s3, couldn't get presigned url for ${type}, ${JSON.stringify(err)}`);
                console.log(err);
                return;
            }
            console.log(key, url);
            return {
                key,
                url
            }
        }
    );
}

module.exports = generatePresignedUrlForImages;