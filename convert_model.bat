@echo off
echo ==========================================
echo Chess Analyzer Model Converter
echo ==========================================
echo.
echo This script will convert the Python SavedModel in 'nn/model.tf'
echo to a Tensorflow.js web-ready format in 'public/models/tfjs_model'.
echo.
echo 1. Installing tensorflowjs (requires Python to be installed)...
pip install tensorflowjs

echo.
echo 2. Creating output directory...
mkdir "public\models\tfjs_model" 2>nul

echo.
echo 3. Converting model...
tensorflowjs_converter --input_format=tf_saved_model --output_node_names="StatefulPartitionedCall" --saved_model_tags=serve "nn/model.tf" "public/models/tfjs_model"

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Conversion failed. Please check if Python is installed and 'nn/model.tf' exists.
    pause
    exit /b %errorlevel%
)

echo.
echo [SUCCESS] Model converted!
echo You can now refresh the web page. The app will automatically load the model from 'public/models/tfjs_model'.
echo.
pause
