@echo off
chcp 65001 >nul
title AICD Platform - 停止

echo ============================================================
echo   AICD Platform — 停止服务
echo ============================================================
echo.

docker compose down

echo.
echo 所有服务已停止。
echo.
echo 如需同时清除数据库数据，请运行: docker compose down -v
echo.
pause
