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

print subprocess.Popen("./activator -J-Xms256m -J-Xmx256m clean stage", shell=True, stdout=subprocess.PIPE).stdout.read()

os.chdir("..")

print "\n ### Finished"