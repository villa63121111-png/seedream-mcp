# Seedream MCP Server — 部署与接入指南

这是一个最小化的 MCP server,把字节跳动 Seedream 文生图模型包装成一个
工具,供 Claude / Claude Cowork 通过自定义连接器调用。

---

## 第一步:在本地准备好代码

1. 把这整个 `seedream-mcp` 文件夹下载到你的 Mac 上(放在比如
   `~/Projects/seedream-mcp`)。
2. 打开 Terminal,进入这个目录:

   ```bash
   cd ~/Projects/seedream-mcp
   ```

3. 安装依赖:

   ```bash
   npm install
   ```

---

## 第二步:部署到 Vercel(免费)

1. 如果还没有 Vercel 账号,去 https://vercel.com 用 GitHub / 邮箱注册一个
   (免费 Hobby 套餐完全够用)。

2. 在 Terminal 安装 Vercel 命令行工具:

   ```bash
   npm install -g vercel
   ```

3. 登录:

   ```bash
   vercel login
   ```

   会打开浏览器让你确认登录,按提示完成即可。

4. 在项目目录里执行部署:

   ```bash
   vercel
   ```

   第一次部署会问你几个问题,一路按回车选默认值即可(Set up and deploy?
   Yes / 选择你的账号 / Link to existing project? No / 项目名直接回车 /
   目录直接回车 / 是否覆盖设置? No)。

   部署完成后,终端会给你一个预览地址,类似:
   `https://seedream-mcp-xxxx.vercel.app`

5. 配置环境变量(把第一步拿到的 API Key 和模型 ID 填进去,不要写进代码里):

   ```bash
   vercel env add ARK_API_KEY
   ```
   粘贴你的 API Key,选择应用到 Production / Preview / Development 全部环境。

   ```bash
   vercel env add ARK_MODEL_ID
   ```
   填入你在火山方舟控制台开通的 Seedream 模型 ID(在"在线推理" /
   "模型管理"里能看到,通常形如 `doubao-seedream-4-0-250828` 或者是你自己
   创建的接入点 Endpoint ID,例如 `ep-xxxxxxxxxx`)。

6. 配置完环境变量后,重新部署一次让它生效:

   ```bash
   vercel --prod
   ```

   这次会给你一个正式的生产环境地址,例如:
   `https://seedream-mcp.vercel.app`

   你的 MCP server 完整地址就是:

   ```
   https://seedream-mcp.vercel.app/api/mcp
   ```

   把这个地址记下来,下一步要用。

---

## 第三步:在 Cowork 里接入

1. 打开 Claude,进入 Cowork 标签页。
2. 打开左侧 Customize(自定义)菜单 → Connectors(连接器)标签。
3. 点击 "+" → "Add Custom Connector"(添加自定义连接器)。
4. 填写:
   - 名称:`Seedream`(随意取)
   - URL:`https://seedream-mcp.vercel.app/api/mcp`(你自己的地址)
5. 保存后,Cowork 应该会显示这个连接器暴露出的工具,
   能看到 `generate_image` 这个工具说明文字。
6. 在 Cowork 对话里直接说,比如:
   "帮我生成一张极简商务风格的插画,16:9,用在 PPT 封面上,主题是数字化转型"
   Claude 就会自动调用这个工具。

---

## 关于费用

- Vercel Hobby 套餐免费,这种轻量调用完全用不到付费额度。
- 真正花钱的是火山方舟按张数 / 分辨率计费的 Seedream 调用,
  注册时一般有免费试用额度,具体单价以方舟控制台计费说明为准。

## 后续可扩展

如果之后想要更复杂的能力(比如图生图、批量生成、自动插入到 PPT 里的图片
占位符),可以在 `api/mcp.js` 里继续加 `server.registerTool(...)`,
原理完全一样,新增一个工具定义 + 调用对应的 Ark API 接口即可。
