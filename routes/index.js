var express = require('express');
var router = express.Router();
const cors = require("cors");
const base64 = require("image-to-base64");
const axios = require("axios")
const https = require("https");
const apiStory = "https://sssinstagram.com/api/ig/story"
const apiHighlight = "https://sssinstagram.com/api/ig/highlightStories/highlight:"
const http = require('http');


/* GET home page. */
// router.get('/', function (req, res, next) {
//     res.render('index', {title: 'Express'});
// });
// utils
const imgUrlToBase64 = async (url) => {
    const res = await base64(url);
    return `data:image/jpeg;base64,${res}`;
};

function extractInstagramCode(url) {
    // Tạo đối tượng URL từ đường link
    let urlObj = new URL(url);

    // Lấy pathname từ URL (phần sau domain)
    let pathname = urlObj.pathname;

    // Tách các phần của đường dẫn thành mảng
    let pathSegments = pathname.split('/');

    // Phần code cần lấy thường nằm ở phần thứ 3 của đường dẫn (index 2)
    return pathSegments[2] || '';
}
const NodeCache = require('node-cache');
const imageCache = new NodeCache({stdTTL: 600, checkperiod: 120});

router.get('/proxy-image', async (req, res) => {
    try {
        const url = req.query.url;
        const cachedImage = imageCache.get(url);

        if (cachedImage) {
            res.setHeader('Content-Type', cachedImage.contentType);
            return res.send(cachedImage.data);
        }

        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            http2: true,  // Sử dụng HTTP/2 nếu có thể
            maxRedirects: 5,
            timeout: 5000,  // Đặt thời gian chờ để tối ưu hóa tốc độ
        });

        const buffer = Buffer.from(response.data, 'binary');
        imageCache.set(url, {data: buffer, contentType: response.headers['content-type']});

        res.setHeader('Content-Type', response.headers['content-type']);
        res.send(buffer);
    } catch (error) {
        console.error('Error fetching the image:', error);
        res.status(500).send('Error fetching the image');
    }
});

router.get('/download', async function (req, res, next) {
    try {

        const header = {
            'Accept': 'application/json, text/plain, */*',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'Accept-Language': 'vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5',
            'Priority': 'u=1, i',
            'Sec-CH-UA': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
            'Sec-CH-UA-Mobile': '?0',
            'Sec-CH-UA-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
        };

        const {urlBase} = req.query
        console.log(urlBase)
        const parsedUrl = new URL(urlBase);
        const agent = new https.Agent({
            keepAlive: true,
            rejectUnauthorized: false, // Không khuyến khích dùng trong môi trường sản xuất
            secureOptions: require('constants').SSL_OP_LEGACY_SERVER_CONNECT
        });
        // Check if the URL starts with the specific base path
        if (parsedUrl.pathname.startsWith('/stories/highlights')) {
            // Handle highlights
            console.log("highlights")
            // Sử dụng regex để tìm dãy số
            const regex = /\/highlights\/(\d+)\//;
            const match = urlBase.match(regex);
            const number = match[1]
            console.log(number)

            const result = await axios.get(`${apiHighlight}${number}`, {
                headers: header,
                httpsAgent: agent
            })
            // console.log("result", result)
            console.log("result-data: ", result.data)
            console.log("result.data.result", result.data.result)
            let listMedia = []
            result.data.result.forEach((item) => {
                // console.log("item", item)
                console.log("item image-version2", item.image_versions2.candidates[0].url)
                console.log("item video-version", item.video_versions === undefined ? item.video_versions : item.video_versions[0].url)
                const listImageVersion = item.image_versions2.candidates[0].url
                const listVideoVersion = item.video_versions === undefined ? item.video_versions : item.video_versions[0].url

                const media = {
                    listImageVersion,
                    listVideoVersion
                }
                listMedia.push(media)

            })
            console.log(listMedia)


            res.status(200).json({
                result: {
                    type: "story",
                    media: listMedia
                }
            })

        } else if (parsedUrl.pathname.startsWith('/stories')||parsedUrl.pathname.startsWith('/s')) {

            // Handle general stories (excluding highlights)
            console.log("stories")
            const url = urlBase
            console.log(url)
            const result = await axios.get(apiStory, {
                headers: header,
                params: {url},
                httpsAgent: agent
            })
            console.log("result.data", result.data.result)
            let listMedia = []
            result.data.result.forEach((item) => {
                // console.log("item", item)
                console.log("item image-version2", item.image_versions2.candidates[0].url)
                console.log("item video-version", item.video_versions === undefined ? item.video_versions : item.video_versions[0].url)
                const listImageVersion = item.image_versions2.candidates[0].url
                const listVideoVersion = item.video_versions === undefined ? item.video_versions : item.video_versions[0].url

                const media = {
                    listImageVersion,
                    listVideoVersion
                }
                listMedia.push(media)

            })


            res.status(200).json({
                result: {
                    type: "story",
                    // media: result.data.result
                    media: listMedia
                }
            })

        } else {
            const { igdl } = require('ruhend-scraper')
            //https://instagram.com/xxxxxxx

            let response = await igdl(urlBase);
            console.log(response)

            console.log("Response:", response.data);
            const listMedia = []
            let listImageVersion = undefined
            let listVideoVersion = undefined
            let media = undefined
            const uniqueUrls = [...new Set(response.data.map(item => item.url))];
            console.log(uniqueUrls)
            uniqueUrls.forEach(item => {
                console.log("item", item)
                if (item.includes("https://d.rapidcdn.app/d?token=")) {
                    listVideoVersion = item
                } else {
                    listImageVersion = item
                }
                media = {
                    listImageVersion,
                    listVideoVersion
                }
                listMedia.push(media)
            })

            console.log(listMedia)
            res.status(200).json({
                result: {
                    type: "post",
                    media: listMedia
                }
            })
        }
    } catch (e) {
        console.log(e)
        res.status(500).json({
            status: 500,
            msg: "Internal Server Error"
        })
    }
})


module.exports = router;
