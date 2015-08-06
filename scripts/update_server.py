#!/usr/local/bin/python

import os
import subprocess
from git import Repo
from git.remote import RemoteProgress

### SOME DEFINITIONS

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


### SCRIPT	STARTS	HERE

print hilite("\nFinding directory to clone repository to...", True, True)

target_dir_base = "jraph"
target_dir_counter = 0
target_dir = target_dir_base + "_" + str(target_dir_counter)

while os.path.exists(target_dir):
    target_dir_counter += 1
    target_dir = target_dir_base + "_" + str(target_dir_counter)

print hilite("Cloning repository to " + target_dir + "...", True, True)

Repo.clone_from("git@github.com:nadirabid/jraph.git", target_dir, progress=Progress())
os.chdir(target_dir)

print hilite("\nShutting down current running server...", True, True)

print hilite("\nBuilding project...", True, True)

execute("./activator -J-Xms256m -J-Xmx256m clean stage")

print hilite("\nStarting server...", True, True)

start_server = "target/universal/stage/bin/jraph -J-Xms256m -J-Xmx512m -Dconfig.resource=application.prod.conf"
execute(start_server, "p.c.s.NettyServer - Listening for HTTP on")

os.chdir("..")

print hilite("\nFinished", True, True)