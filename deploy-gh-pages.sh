#!/bin/bash

# GitHub Pages 部署脚本

echo "🚀 开始部署到 GitHub Pages..."

# 1. 构建项目
echo "📦 构建项目..."
npm run build

# 2. 进入构建目录
cd dist

# 3. 初始化 git 仓库
git init
git add -A
git commit -m "Deploy to GitHub Pages"

# 4. 推送到 gh-pages 分支
echo "📤 推送到 gh-pages 分支..."
git push -f git@github.com:sumn20/JavaScript_Apk_Analysis.git main:gh-pages

# 5. 返回项目根目录
cd ..

echo "✅ 部署完成！"
echo "🌐 访问地址: https://sumn20.github.io/JavaScript_Apk_Analysis/"