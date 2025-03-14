document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('uploadForm');
    const fileInput = document.getElementById('pdfFile');
    const calculateBtn = document.getElementById('calculateBtn');
    const statusDiv = document.getElementById('status');
    const resultDiv = document.getElementById('result');

    // 更新文件选择状态
    fileInput.addEventListener('change', (e) => {
        const fileName = e.target.files[0]?.name;
        if (fileName) {
            statusDiv.textContent = `已选择文件: ${fileName}`;
            statusDiv.className = 'status success';
            resultDiv.textContent = ''; // 清除之前的结果
        }
    });

    // 处理表单提交
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const file = fileInput.files[0];
        if (!file) {
            statusDiv.textContent = '请选择PDF文件';
            statusDiv.className = 'status error';
            return;
        }

        // 检查文件类型
        if (file.type !== 'application/pdf') {
            statusDiv.textContent = '请上传PDF格式的文件';
            statusDiv.className = 'status error';
            return;
        }

        // 检查文件大小（限制为10MB）
        if (file.size > 10 * 1024 * 1024) {
            statusDiv.textContent = '文件大小不能超过10MB';
            statusDiv.className = 'status error';
            return;
        }

        // 禁用按钮并显示加载状态
        calculateBtn.disabled = true;
        statusDiv.textContent = '正在上传文件...';
        statusDiv.className = 'status';
        resultDiv.textContent = '';

        try {
            const formData = new FormData();
            formData.append('pdfFile', file);
            
            const response = await fetch('/process', {
                method: 'POST',
                body: formData
            });

            let data;
            try {
                const text = await response.text();
                try {
                    data = JSON.parse(text);
                } catch (parseError) {
                    console.error('Response text:', text);
                    throw new Error('服务器返回的数据格式不正确');
                }
            } catch (parseError) {
                console.error('Parse error:', parseError);
                throw new Error('无法解析服务器响应');
            }

            if (!response.ok) {
                throw new Error(data.error || data.details || `服务器错误 (${response.status})`);
            }

            if (data.error) {
                throw new Error(data.error);
            }

            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                console.error('Invalid response format:', data);
                throw new Error('API返回的数据格式不正确');
            }

            const content = data.choices[0].message.content;
            if (!content) {
                throw new Error('API返回的结果为空');
            }

            // 显示处理结果
            resultDiv.textContent = content;
            statusDiv.textContent = '处理完成';
            statusDiv.className = 'status success';
        } catch (error) {
            console.error('Error:', error);
            statusDiv.textContent = `错误: ${error.message}`;
            statusDiv.className = 'status error';
            resultDiv.textContent = '处理失败，请重试';
        } finally {
            calculateBtn.disabled = false;
        }
    });
}); 