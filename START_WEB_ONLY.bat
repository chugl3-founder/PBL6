@echo off
rem Backend + frontend only, for when the AI worker runs on a rented GPU machine (AI_Classifier/scripts/deploy/setup_gpu_server.sh).
call "%~dp0START_ALL_SERVICES.bat" web
