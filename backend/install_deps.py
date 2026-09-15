import subprocess
import sys
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))
subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
print("DONE INSTALLING DEPENDENCIES")
