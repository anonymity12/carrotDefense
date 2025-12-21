/**
 * 后端服务器入口文件
 * 启动 WebSocket 游戏服务器
 */

import { GameServer } from './services/GameServer.js';

// 服务器端口（可通过环境变量配置）
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;

/**
 * 主函数
 */
function main() {
  console.log('='.repeat(50));
  console.log('摩法交通卫士 - 网络对战游戏服务器');
  console.log('Traffic Guard - Network Battle Game Server');
  console.log('='.repeat(50));
  console.log('');

  try {
    // 创建并启动游戏服务器
    const server = new GameServer(PORT);
    
    console.log('');
    console.log('✓ 服务器启动成功！');
    console.log(`✓ WebSocket 端口: ${PORT}`);
    console.log(`✓ 客户端可以连接到: ws://localhost:${PORT}`);
    console.log('');
    console.log('按 Ctrl+C 停止服务器');
    console.log('='.repeat(50));
  } catch (error) {
    console.error('✗ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGINT', () => {
  console.log('');
  console.log('正在关闭服务器...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('');
  console.log('正在关闭服务器...');
  process.exit(0);
});

// 启动服务器
main();
