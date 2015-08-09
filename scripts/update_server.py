#!/usr/bin/python

import os
import subprocess
import time
import glob
import re
from git import Repo
from git.remote import RemoteProgress

### SOME DEFINITIONS

BASE_APP_DIR_NAME = "jraph"

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

def hilite(string, status=True, bold=True):
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
    dir_name_regex = re.compile(BASE_APP_DIR_NAME + "_\d+")
    app_dirs_list = filter(dir_name_regex.match, glob.glob(BASE_APP_DIR_NAME + "_*"))
    sorted_app_dir_versions_list = sorted(map(lambda app_dir: int(app_dir.split("_")[1]), app_dirs_list))
    return max(max(sorted_app_dir_versions_list, [-1]))



### SCRIPT	STARTS	HERE

startTime = time.time()

previous_app_dir_version = find_most_recent_app_dir_version()
previous_app_dir_name = app_dir_name(previous_app_dir_version)

if previous_app_dir_version != -1 and os.path.exists(previous_app_dir_name + "/target/universal/stage/RUNNING_PID"):
    print hilite("Shutting down previous version of the app found running from " + previous_app_dir_name)

    os.chdir(previous_app_dir_name)
    execute("./activator -J-Xms64m -J-Xmx256m stopProd")
    os.chdir("..")


current_app_dir_version = previous_app_dir_version + 1
current_app_dir_name = app_dir_name(current_app_dir_version)

print hilite("Cloning repository to " + current_app_dir_name + "...")

Repo.clone_from("git@github.com:nadirabid/jraph.git", current_app_dir_name, progress=Progress())


print hilite("Building project...")

os.chdir(current_app_dir_name)
execute("./activator -J-Xms128m -J-Xmx512m clean stage")


print hilite("Starting server...")

start_server = "target/universal/stage/bin/jraph -J-Xms256m -J-Xmx512m -Dconfig.resource=application.prod.conf"
execute(start_server, "p.c.s.NettyServer - Listening for HTTP on")
os.chdir("..")

endTime = time.time()

print hilite("Finished. Total time: " + str(endTime - startTime) + " seconds.")