const express = require('express');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
require('dotenv').config();

// 确保上传目录存在
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

const app = express();
const upload = multer({ dest: 'uploads/' });

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: '服务器内部错误',
        details: err.message || '未知错误'
    });
});

// 静态文件服务
app.use(express.static('.'));

// Deepseek API 密钥
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-73e57909b41c407c99baa7bd3cb95d53';

// 预设的指令
const PRESET_INSTRUCTION = "附件中总电量，所有电能表的尖峰总和、峰总和、平总和、谷总和、最大需量值总和，电表号分别是多少？只要数值，不用单位，不要计算过程。";

// 健康检查端点
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.post('/process', upload.single('pdfFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '请上传PDF文件' });
        }

        console.log('开始处理文件:', req.file.originalname);

        // 读取文件内容
        const fileContent = fs.readFileSync(req.file.path, { encoding: 'base64' });
        console.log('文件已读取，大小:', fileContent.length);

        // 准备请求数据
        const requestData = {
            model: "deepseek-chat",
            messages: [
                {
                    role: "user",
                    content: PRESET_INSTRUCTION,
                    files: [{
                        type: "pdf",
                        content: fileContent
                    }]
                }
            ],
            temperature: 0.7,
            max_tokens: 2000
        };

        console.log('准备发送请求到 Deepseek API');

        try {
            // 发送请求到 Deepseek API
            const response = await axios.post('https://api.deepseek.com/v1/chat/completions', 
                requestData,
                {
                    headers: {
                        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 60000 // 60秒超时
                }
            );

            console.log('收到 API 响应:', JSON.stringify(response.data, null, 2));

            if (!response.data) {
                throw new Error('API 响应为空');
            }

            if (!response.data.choices || !Array.isArray(response.data.choices)) {
                throw new Error('API 响应中缺少 choices 数组');
            }

            const result = {
                choices: [{
                    message: {
                        content: response.data.choices[0]?.message?.content || '无法解析API返回结果'
                    }
                }]
            };

            console.log('发送处理结果到客户端');
            res.json(result);
        } catch (apiError) {
            console.error('API Error:', apiError);
            console.error('API Response:', apiError.response?.data);
            res.status(500).json({
                error: 'API调用失败',
                details: apiError.response?.data?.error?.message || apiError.message
            });
        }

    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({
            error: '处理请求时发生错误',
            details: error.message || '未知错误'
        });
    } finally {
        // 确保在所有情况下都清理文件
        if (req.file && fs.existsSync(req.file.path)) {
            try {
                fs.unlinkSync(req.file.path);
                console.log('临时文件已删除');
            } catch (err) {
                console.error('Error deleting file:', err);
            }
        }
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 