#!/usr/bin/python
from os import listdir
from subprocess import call
import argparse

def demux_folder(folder):
    files = listdir(folder)

    video_file = [vf for vf in files if '.mp4' in vf]
    audio_files = [af for af in files if '.mp3' in af]

    for vf in video_file:
        basename = vf.replace('.mp4','')
        basenamefolder = "%s/%s" % (folder,basename)

        if "_video.mp4" in video_file:
            # Already proccessed, skip
            continue

        # demux audio if it doesn't exist
        if basename + "_audio.mp3" not in audio_files:
            call("ffmpeg -i %s.mp4 -vn -q:a 0 -map a %s_audio.mp3" % (basenamefolder,basenamefolder), shell=True)
            audio_files.append("%s_audio.mp3" % basename)

        if basename + "_audio.mp4" not in video_file:
            call("ffmpeg -i %s.mp4 -c copy -an %s_video.mp4" % (basenamefolder,basenamefolder), shell=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Demuxes video and audio from mp4 files within a folder.' \
                                                 'This is a pretty hacky script, so make sure no files end' \
                                                 'with _video.mp4 since I use that suffix to name the video' \
                                                 'only file')
    parser.add_argument('folder', metavar='F', type=str,
                   help='absolute or relative path to folder')

    args = parser.parse_args()

    # Demux folder
    demux_folder(args.folder)