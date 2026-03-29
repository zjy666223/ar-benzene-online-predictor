# AR 苯暴露在线预测器

这是一个可直接部署到 GitHub Pages 的静态网页版本，用于展示苯暴露与过敏性鼻炎发生风险、以及 AR 诊断后生存轮廓的理论参考预测结果。

## 功能

- AR 风险预测模块
- AR 生存预测模块
- 实时结果更新
- 可分享链接
- 可复制摘要
- 论文展示风格界面

## 公式来源

本网页保留了原始理论网页预测器中的公式结构，并将其从 Shiny 改写为纯 HTML、CSS、JavaScript 版本。

### AR 风险

```text
lp = -4.2
   + 1.9 * (benzene - 0.43)
   + 0.95 * I(asthma = Yes)
   + 0.31 * I(smoke = Yes)
   + 0.12 * ((age - 58) / 10)
   + 0.21 * I(htn = Yes)
   - 0.14 * I(sex = Male)

risk = 1 / (1 + exp(-lp))
```

### AR 生存

```text
lp = 0.39 * ((age - 58) / 10)
   + 0.64 * I(smoke = Yes)
   + 0.28 * kdm
   + 0.19 * ((benzene - 0.43) / 0.075)
   + 0.34 * I(diabetes = Yes)
   + 0.17 * I(sex = Male)

base_5y = 0.965
survival(t) = exp(-h0 * t * exp(lp))
where h0 = -log(base_5y) / 5
```

## 使用方式

直接打开 `index.html` 即可查看；若要更接近线上环境，建议使用本地静态服务。

```bash
python3 -m http.server 8000
```

然后访问：

```text
http://localhost:8000
```

## 部署

本项目适合部署到 GitHub Pages。仓库根目录即网页根目录。

## 声明

这是理论参考网页，仅用于论文展示、方法沟通和结果预览，不用于临床决策，不代表外部验证后的正式风险模型。
