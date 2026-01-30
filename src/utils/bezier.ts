/**
 * 贝塞尔曲线计算工具
 */

export interface BezierControlPoints {
  cp1x: number;
  cp1y: number;
  cp2x: number;
  cp2y: number;
}

/**
 * 计算三次贝塞尔曲线的控制点
 * @param startX 起点X
 * @param startY 起点Y
 * @param endX 终点X
 * @param endY 终点Y
 * @param curvature 曲率系数（默认0.5）
 * @returns 控制点坐标
 */
export function calculateBezierControlPoints(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  curvature: number = 0.5
): BezierControlPoints {
  const dx = endX - startX;
  const dy = endY - startY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // 计算基础方向角
  const angle = Math.atan2(dy, dx);
  
  // 控制点偏移量基于距离和曲率
  const offset = Math.min(distance * curvature, 150);
  
  // 计算垂直方向（用于添加自然的弯曲）
  const perpAngle1 = angle + Math.PI / 4;  // 45度偏移
  const perpAngle2 = angle - Math.PI / 4;
  
  // 第一个控制点：从起点出发，沿方向偏移
  const cp1x = startX + Math.cos(angle) * offset * 0.3 + Math.cos(perpAngle1) * offset * 0.2;
  const cp1y = startY + Math.sin(angle) * offset * 0.3 + Math.sin(perpAngle1) * offset * 0.2;
  
  // 第二个控制点：向终点靠近，反向偏移
  const cp2x = endX - Math.cos(angle) * offset * 0.3 + Math.cos(perpAngle2) * offset * 0.2;
  const cp2y = endY - Math.sin(angle) * offset * 0.3 + Math.sin(perpAngle2) * offset * 0.2;
  
  return { cp1x, cp1y, cp2x, cp2y };
}

/**
 * 生成三次贝塞尔曲线路径字符串
 * @param startX 起点X
 * @param startY 起点Y
 * @param endX 终点X
 * @param endY 终点Y
 * @param curvature 曲率系数
 * @returns SVG路径字符串
 */
export function generateBezierPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  curvature: number = 0.5
): string {
  const { cp1x, cp1y, cp2x, cp2y } = calculateBezierControlPoints(
    startX, startY, endX, endY, curvature
  );
  
  return `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
}

/**
 * 计算贝塞尔曲线上某点的坐标
 * @param t 参数（0-1）
 * @param startX 起点X
 * @param startY 起点Y
 * @param cp1x 控制点1X
 * @param cp1y 控制点1Y
 * @param cp2x 控制点2X
 * @param cp2y 控制点2Y
 * @param endX 终点X
 * @param endY 终点Y
 * @returns 曲线上点的坐标
 */
export function getBezierPoint(
  t: number,
  startX: number,
  startY: number,
  cp1x: number,
  cp1y: number,
  cp2x: number,
  cp2y: number,
  endX: number,
  endY: number
): { x: number; y: number } {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;
  
  const x = uuu * startX + 3 * uu * t * cp1x + 3 * u * tt * cp2x + ttt * endX;
  const y = uuu * startY + 3 * uu * t * cp1y + 3 * u * tt * cp2y + ttt * endY;
  
  return { x, y };
}

/**
 * 计算贝塞尔曲线的长度（近似值）
 * @param startX 起点X
 * @param startY 起点Y
 * @param cp1x 控制点1X
 * @param cp1y 控制点1Y
 * @param cp2x 控制点2X
 * @param cp2y 控制点2Y
 * @param endX 终点X
 * @param endY 终点Y
 * @param segments 分段数（默认20）
 * @returns 曲线长度
 */
export function getBezierLength(
  startX: number,
  startY: number,
  cp1x: number,
  cp1y: number,
  cp2x: number,
  cp2y: number,
  endX: number,
  endY: number,
  segments: number = 20
): number {
  let length = 0;
  let prevPoint = { x: startX, y: startY };
  
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const point = getBezierPoint(t, startX, startY, cp1x, cp1y, cp2x, cp2y, endX, endY);
    const dx = point.x - prevPoint.x;
    const dy = point.y - prevPoint.y;
    length += Math.sqrt(dx * dx + dy * dy);
    prevPoint = point;
  }
  
  return length;
}

/**
 * 计算从节点边缘出发的起点（用于连接线）
 * @param fromX 节点中心X
 * @param fromY 节点中心Y
 * @param fromRadius 节点半径
 * @param toX 目标中心X
 * @param toY 目标中心Y
 * @returns 节点边缘上的点
 */
export function getEdgePoint(
  fromX: number,
  fromY: number,
  fromRadius: number,
  toX: number,
  toY: number
): { x: number; y: number } {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  return {
    x: fromX + Math.cos(angle) * fromRadius,
    y: fromY + Math.sin(angle) * fromRadius
  };
}

/**
 * 计算拖拽生成时的弹性曲线
 * 模拟橡皮筋效果
 * @param startX 起点X
 * @param startY 起点Y
 * @param endX 终点X
 * @param endY 终点Y
 * @param tension 张力系数（0-1，默认0.3）
 * @returns SVG路径字符串
 */
export function generateElasticBezierPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  tension: number = 0.3
): string {
  const dx = endX - startX;
  const dy = endY - startY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // 计算方向角
  const angle = Math.atan2(dy, dx);
  
  // 控制点在中间，带有垂直偏移产生曲线
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  
  // 垂直偏移量（产生橡皮筋的弯曲感）
  const sag = distance * tension * 0.3;
  const perpAngle = angle + Math.PI / 2;
  
  const cpX = midX + Math.cos(perpAngle) * sag;
  const cpY = midY + Math.sin(perpAngle) * sag;
  
  // 使用二次贝塞尔曲线（一个控制点，更简洁）
  return `M ${startX} ${startY} Q ${cpX} ${cpY}, ${endX} ${endY}`;
}

/**
 * 生成平滑的S形曲线
 * @param startX 起点X
 * @param startY 起点Y
 * @param endX 终点X
 * @param endY 终点Y
 * @param curvature 曲率
 * @returns SVG路径字符串
 */
export function generateSShapePath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  curvature: number = 0.5
): string {
  const dx = endX - startX;
  
  // 控制点产生S形
  const cp1x = startX + dx * curvature;
  const cp1y = startY;
  const cp2x = endX - dx * curvature;
  const cp2y = endY;
  
  return `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
}
