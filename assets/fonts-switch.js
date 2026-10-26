// fonts.css 以 print 媒体加载，不阻塞首屏渲染；此处启用为全部媒体，字体随后生效。
// 独立成文件，页面不写内联 onload，便于 CSP 禁止内联脚本。
const fontsCss = document.getElementById('fontsCss');
if (fontsCss) fontsCss.media = 'all';
