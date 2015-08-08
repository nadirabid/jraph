#!/usr/local/bin/python

import os
import subprocess
import glob
from git import Repo
from git.remote import RemoteProgress

### SOME DEFINITIONS

BASE_APP_DIR_NAME = "jraph_"

class Progress(RemoteProgress):
    def line_dropped(self, line):
        print line
    def update(self, *args):
        print self._cur_line

def execute(command, exitOutput=None):
    popen = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE)
    lines_iterator = iter(popen.stdout.readline, b"")
    for line in lines_iterator:
        if exitOutput is not None and exitOutput in line:
            print(line) # yield line
            break
        else:
            print(line)

def hilite(string, status, bold):
    attr = []
    if status:
        # green
        attr.append('32')
    else:
        # red
        attr.append('31')
    if bold:
        attr.append('1')
    return '\x1b[%sm%s\x1b[0m' % (';'.join(attr), string)

def app_dir_name(dir_version):
    return BASE_APP_DIR_NAME + "_" + str(dir_version)

def find_most_recent_app_dir_version():
    app_dirs_list = glob.glob(BASE_APP_DIR_NAME + "*")
    sorted_app_dir_versions_list = sorted(map(lambda app_dir: int(app_dir.split("_")[1]), app_dirs_list))
    return max(sorted_app_dir_versions_list)



### SCRIPT	STARTS	HERE

previous_app_dir_version = find_most_recent_app_dir_version()
previous_app_dir_name = app_dir_name(previous_app_dir_version)

print hilite("\nFinding directory to clone repository to...", True, True)

current_app_dir_version = previous_app_dir_version + 1
current_app_dir_name = app_dir_name(current_app_dir_version)



print hilite("Cloning repository to " + current_app_dir_name + "...", True, True)

Repo.clone_from("git@github.com:nadirabid/jraph.git", current_app_dir_name, progress=Progress())



print hilite("\nShutting down current running server...", True, True)


print hilite("\nBuilding project...", True, True)

os.chdir(current_app_dir_name)
execute("./activator -J-Xms256m -J-Xmx256m clean stage")



print hilite("\nStarting server...", True, True)

start_server = "target/universal/stage/bin/jraph -J-Xms256m -J-Xmx512m -Dconfig.resource=application.prod.conf"
#execute(start_server, "p.c.s.NettyServer - Listening for HTTP on")
os.chdir("..")



print hilite("\nFinished", True, True)