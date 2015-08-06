#!/usr/local/bin/python

import os
import subprocess
from git import Repo
from git.remote import RemoteProgress

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

print "\n ### Finding directory to clone repository to..."

target_dir_base = "jraph"
target_dir_counter = 0
target_dir = target_dir_base + "_" + str(target_dir_counter)

while os.path.exists(target_dir):
    target_dir_counter += 1
    target_dir = target_dir_base + "_" + str(target_dir_counter)

print "\n ### Cloning repository to " + target_dir + "..."

Repo.clone_from("git@github.com:nadirabid/jraph.git", target_dir, progress=Progress())
os.chdir(target_dir)

print "\n ### Building project..."

execute("./activator -J-Xms256m -J-Xmx256m clean stage")

print "\n ### Starting server..."

start_server = "target/universal/stage/bin/jraph -J-Xms256m -J-Xmx512m -Dconfig.resource=application.prod.conf"
execute(start_server, "p.c.s.NettyServer - Listening for HTTP on")

os.chdir("..")

print "\n ### Finished"