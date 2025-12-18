import { useState } from 'react';

export function FloatingQRCode() {
  const [isHovered, setIsHovered] = useState(false);

  // 原图尺寸 1074x1455，保持比例，设置宽度为 220px
  const imgWidth = 220;
  const imgHeight = Math.round(imgWidth * (1455 / 1074)); // ≈ 298

  return (
    <div
      style={{
        position: 'fixed',
        right: '20px',
        bottom: '20px',
        zIndex: 1000,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 悬浮球 - 带"交流群"文字 */}
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #07c160 0%, #06ad56 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(7, 193, 96, 0.4)',
          transition: 'transform 0.2s, box-shadow 0.2s',
          transform: isHovered ? 'scale(1.1)' : 'scale(1)',
        }}
      >
        {/* 微信群图标 SVG */}
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="white"
        >
          <path d="M8.5 3C4.91 3 2 5.46 2 8.5c0 1.74.94 3.28 2.4 4.28L4 15l2.5-1.25c.62.16 1.28.25 2 .25.17 0 .34-.01.5-.02-.03-.24-.05-.49-.05-.73 0-3.04 2.91-5.5 6.5-5.5.17 0 .34.01.5.02C15.45 4.94 12.27 3 8.5 3z" />
          <path d="M15.5 9c-3.04 0-5.5 2.01-5.5 4.5 0 2.49 2.46 4.5 5.5 4.5.58 0 1.14-.07 1.67-.2L19.5 19l-.3-1.89c1.14-.82 1.8-2 1.8-3.31 0-2.49-2.46-4.5-5.5-4.5z" />
        </svg>
        {/* 交流群文字 */}
        <span style={{
          color: 'white',
          fontSize: '10px',
          fontWeight: 'bold',
          marginTop: '2px',
        }}>
          交流群
        </span>
      </div>

      {/* 二维码弹出框 */}
      {isHovered && (
        <div
          style={{
            position: 'absolute',
            bottom: '78px',
            right: '0',
            background: 'white',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div style={{
            color: '#333',
            fontSize: '14px',
            fontWeight: 'bold',
            marginBottom: '12px',
            textAlign: 'center',
            maxWidth: `${imgWidth}px`,
          }}>
            扫码发送 "leetcode" 加入算法交流群
          </div>
          <img
            src="/assets/wechat-qrcode.png"
            alt="微信二维码"
            style={{
              width: `${imgWidth}px`,
              height: `${imgHeight}px`,
              borderRadius: '8px',
              display: 'block',
            }}
          />
          {/* 小三角箭头 */}
          <div
            style={{
              position: 'absolute',
              bottom: '-8px',
              right: '24px',
              width: '0',
              height: '0',
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '8px solid white',
            }}
          />
        </div>
      )}
    </div>
  );
}
