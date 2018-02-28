DEBUG = False
RESTRICT_IPS=False
#DAEMONIZE=False
#DEBUG = True
#RESTRICT_IPS=True
USERNAME='openaire'
PASSWORD='openaire'
WEB_SERVER_PORT=8080
APPDIRNAME='openaireplus'
MADIS_PATH='../../../interactive-mining-3rdparty-madis/madis/src'
DB='static/database.db'
RESET_FIELDS=1

FLOW_PATH=''

# Change this. Make this unique, and don't share it with anybody.
SECRET_KEY = 's2b8!44p$0ycp!&p6)bhfoliuhdfvsieuppk5wl!@z=$#xj7yoc23fvr'

# Check to see if some of the variables are defined
try: DB
except NameError: DB=''

try: DAEMONIZE
except NameError: DAEMONIZE=False

try: USERNAME
except NameError: USERNAME=''

# Set madIS connection
import sys
sys.path.append(MADIS_PATH)

import madis

Connection=madis.functions.Connection(DB)

def curip():
    import socket
    ips = [ip for ip in socket.gethostbyname_ex(socket.gethostname())[2] if not ip.startswith("127.")]
    if ips == []:
        return '127.0.1.1'
    else:
        return [ip for ip in socket.gethostbyname_ex(socket.gethostname())[2] if not ip.startswith("127.")][0]

cclass='.'.join(curip().split('.')[0:3])
RESTRICT_IP_WHITELIST= ['127.0.0.1']+[cclass+"."+str(i) for i in range(1,255)]
