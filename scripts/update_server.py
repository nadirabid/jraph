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

def execute(command):
    popen = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE)
    lines_iterator = iter(popen.stdout.readline, b"")
    for line in lines_iterator:
        print(line) # yield line

print "\n ### Cloning repository..."

target_dir_base = "jraph"
target_dir_counter = 0
target_dir = target_dir_base + "_" + str(target_dir_counter)

while os.path.exists(target_dir):
    target_dir_counter += 1
    target_dir = target_dir_base + "_" + str(target_dir_counter)

print "\n ### Cloning repository to " + target_dir + "..."

Repo.clone_from("git@github.com:nadirabid/jraph.git", target_dir, progress=Progress())

print "\n ### Building project..."

os.chdir(target_dir)

execute("./activator -J-Xms256m -J-Xmx256m clean stage");

print "\n ### Starting server..."

start_server = "target/universal/stage/bin/jraph -J-Xms256m -J-Xmx512m -Dapplication.secret=VPb0t04YT^T@80DbA7f9aZB:NwjhfRJph5ctdJ@n1Bz3Ahfu0dEZpJ9tyA_qD3ce -Dneo4j.username=neo4j -Dneo4j.password=c4Q-q9N-wSp-uWk &"
execute(start_server)

os.chdir("..")

print "\n ### Finished"