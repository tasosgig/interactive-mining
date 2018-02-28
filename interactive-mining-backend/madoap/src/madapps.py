import json
#Query flows DO NOT SUPPORT COMMENTS!!!!!!!!!!!!!!!!!!!

def getfromfile(filename):
    import os
    with open(os.path.join(settings.FLOW_PATH,filename)) as f:
        return f.read()

false=0
true=1

apps=[


]