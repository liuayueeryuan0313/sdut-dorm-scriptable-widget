# 查寝 / 电量

适用于 iPhone Scriptable 的中号（4×2）查寝与电量组件。

<img src="images/normal.png" width="338" alt="最近查寝与剩余电量" /> <img src="images/low.png" width="338" alt="低于20度时数字与圆环变红" />

*效果示意，均为示例数据。*

## 特征

- 左侧显示最近查寝成绩、等级和日期，右侧圆环显示剩余电量。
- 固定深色；低于 20 度时数字和圆环变红。
- 自动记录充值后的总电量，显示「共 ×× 度」，圆环随用电减少；缺失值显示「—」。
- 支持 HTTP / HTTPS、Keychain 保存配置及离线缓存；建议每 30 分钟刷新，实际由 iOS 调度。

## 用法

1. 下载 [DormElectricity.js](https://raw.githubusercontent.com/liuayueeryuan0313/sdut-dorm-scriptable-widget/main/DormElectricity.js)，导入 Scriptable。
2. 部署支持专用接口的 [sdut-dorm-monitor](https://github.com/liuayueeryuan0313/sdut-dorm-monitor)，在「连接与计划 → 小组件接口」生成 Token。
3. 运行脚本 →「配置接口与 Token」，填服务地址和完整 `dw_` Token。可填 `http://IP:端口` 或完整 `/api/widget/v1/dorm` 地址；手机需能访问服务。
4. 向桌面添加 Scriptable 中号组件并选择此脚本，无需手动设置总电量。

## 自动识别充值

首次获取有效电量时，以当前剩余电量作为总量起点。之后每当新的有效读数比上次增大，就视为充值，将该读数保存为本轮总量。例如从 15 度升到 65 度后显示「共 65 度」；用到 60 度时总量仍是 65 度，下次充值后重新计算。更新前手动设置的固定总量不再使用。

总量和上次读数保存在本机 Keychain，关闭脚本或离线时也会保留。只比较采集时间更新、状态正常且非历史值的读数，重复读数、过期数据、离线缓存和示例预览不会触发充值判断。切换服务地址或 Token 后重新记录。

识别依据是组件实际获取到的电量变化，不会主动触发学校采集。如果两次刷新之间的充值被耗电抵消，或服务器校正读数使电量升高，仅靠此接口无法准确区分；首次安装也无法还原之前的充值总量。

## 开发验证

无需安装依赖，使用 Node.js 运行：

```sh
node --input-type=module --check < DormElectricity.js
node --test tests/widget.test.cjs
```

测试使用模拟 Scriptable API，真实布局需在 iPhone Scriptable 中预览。

读取不会触发学校采集。更新版本时替换脚本即可，已保存配置会保留。
