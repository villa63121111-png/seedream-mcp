// api/mcp.js
//
// 一个最小化的 MCP server,通过 HTTP (Streamable HTTP transport) 暴露
// 一个 "generate_image" 工具,内部调用火山引擎方舟 (Volcengine Ark) 的
// Seedream 文生图接口。
//
// 部署到 Vercel 后,这个文件会变成一个 Serverless Function,
// 对外地址形如: https://你的项目名.vercel.app/api/mcp
// 这个地址就是你要填进 Cowork 自定义连接器里的 MCP Server URL。
//
// 需要的环境变量 (在 Vercel 项目设置里配置,不要写死在代码里):
//   ARK_API_KEY      - 火山方舟 API Key
//   ARK_MODEL_ID     - 你开通的 Seedream 模型 ID / Endpoint ID
//                       (例如 doubao-seedream-4-0-250828,以控制台为准)

const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const {
  StreamableHTTPServerTransport,
} = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const { z } = require("zod");

const ARK_API_URL =
  "https://ark.cn-beijing.volces.com/api/v3/images/generations";

function getServer() {
  const server = new McpServer({
    name: "seedream-image-generator",
    version: "1.0.0",
  });

  server.registerTool(
    "generate_image",
    {
      title: "Generate Image with Seedream",
      description:
        "使用字节跳动 Seedream 模型根据文字描述生成图片。适用于 PPT 配图、" +
        "插画、产品图、场景图等多种通用场景。返回图片的可直接访问 URL。",
      inputSchema: {
        prompt: z
          .string()
          .describe(
            "图片内容的详细文字描述,建议包含主体、风格、构图、色调等信息。" +
              "例如:'极简商务风格插画,一位职场女性站在数据图表前,蓝白配色,扁平化设计'"
          ),
        size: z
          .enum([
            "1024x1024",
            "864x1152",
            "1152x864",
            "1280x720",
            "720x1280",
            "832x1248",
            "1248x832",
            "1512x648",
          ])
          .default("1024x1024")
          .describe(
            "图片尺寸。PPT 16:9 配图建议用 1280x720,竖版海报建议用 720x1280," +
              "通用配图用 1024x1024。"
          ),
        watermark: z
          .boolean()
          .default(false)
          .describe("是否添加水印,默认不添加"),
      },
    },
    async ({ prompt, size, watermark }) => {
      const apiKey = process.env.ARK_API_KEY;
      const modelId = process.env.ARK_MODEL_ID;

      if (!apiKey || !modelId) {
        return {
          content: [
            {
              type: "text",
              text:
                "服务器未正确配置:缺少 ARK_API_KEY 或 ARK_MODEL_ID 环境变量。" +
                "请在 Vercel 项目设置里添加这两个环境变量后重新部署。",
            },
          ],
          isError: true,
        };
      }

      try {
        const resp = await fetch(ARK_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: modelId,
            prompt,
            size,
            watermark,
            response_format: "url",
          }),
        });

        const data = await resp.json();

        if (!resp.ok) {
          return {
            content: [
              {
                type: "text",
                text: `Seedream API 调用失败 (HTTP ${resp.status}): ${JSON.stringify(
                  data
                )}`,
              },
            ],
            isError: true,
          };
        }

        const imageUrl = data?.data?.[0]?.url;

        if (!imageUrl) {
          return {
            content: [
              {
                type: "text",
                text: `未能从响应中解析出图片 URL,原始响应: ${JSON.stringify(
                  data
                )}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `图片生成成功。\n提示词: ${prompt}\n尺寸: ${size}\n图片地址: ${imageUrl}\n\n注意: 该链接通常有时效性,请及时下载保存。`,
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `请求 Seedream API 时发生错误: ${err.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  return server;
}

// Vercel Serverless Function 入口
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed, use POST" });
    return;
  }

  const server = getServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless 模式,每次请求独立处理
  });

  res.on("close", () => {
    transport.close();
    server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("MCP request error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
};
