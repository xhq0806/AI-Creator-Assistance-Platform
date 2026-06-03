@echo off
chcp 65001 >nul
title AICD Platform - 启动

echo ============================================================
echo   AICD Platform — Docker 一键启动
echo ============================================================
echo.

REM 检查 Docker 是否运行
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] Docker 未运行！请先启动 Docker Desktop 再运行此脚本。
    echo 下载地址: https://www.docker.com/products/docker-desktop/
    echo.
    pause
    exit /b 1
)

echo [1/3] 检查 .env 文件...
if not exist .env (
    echo [提示] .env 文件不存在，正在从模板创建...
    copy .env.production.example .env >nul
    echo [提示] 已创建 .env 文件，请用记事本打开编辑：
    echo         - JWT_SECRET（随便改一个长字符串）
    echo         - ARK_API_KEY（你的火山方舟 API Key）
    echo.
    echo 编辑完成后按任意键继续...
    pause >nul
)

echo [2/3] 构建并启动所有服务...
docker compose up -d --build
if %errorlevel% neq 0 (
    echo.
    echo [错误] 启动失败，请检查错误信息。
    pause
    exit /b 1
)

echo [3/3] 等待服务就绪...
timeout /t 15 /nobreak >nul

echo.
echo ============================================================
echo   启动完成！
echo.
echo   前端页面: http://localhost:8080
echo   API 文档: http://localhost:8080/api/v1/docs
echo   健康检查: http://localhost:8080/api/v1/health
echo.
echo   查看日志: docker compose logs -f
echo   停止服务: docker compose down
echo ============================================================
echo.
pause
