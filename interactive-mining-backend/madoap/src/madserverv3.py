#!/usr/bin/env python
#
# Copyright 2009 Facebook
#
# Licensed under the Apache License, Version 2.0 (the "License"); you may
# not use this file except in compliance with the License. You may obtain
# a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
# WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
# License for the specific language governing permissions and limitations
# under the License.
import os
import re
import os.path
import tornado.httpserver
import tornado.autoreload
import tornado.ioloop
import tornado.options
import tornado.web
import tornado.escape as escape
import settings as msettings
import madapps
import datetime
import random
import csv
from shutil import copyfile
import itertools
import email.utils
import json
import StringIO
from tornado.options import define, options, logging
from tornado_addons import ozhandler
import copy
from collections import OrderedDict


define("port", default=msettings.WEB_SERVER_PORT, help="run on the given port", type=int)

filteredapps=None
filteredevals=None

smallgif='GIF89a\1\0\1\0\x80\xff\0\xff\xff\xff\0\0\0,\0\0\0\0\1\0\1\0\0\2\2D\1\0;'

viswidgetmap={
'motionchart':'google.visualization.MotionChart',
'table':'google.visualization.Table',
'linechart':'google.visualization.LineChart',
'piechart':'google.visualization.PieChart',
'scatterchart':'google.visualization.ScatterChart',
'intensitymap':'google.visualization.IntensityMap',
'geomap':'google.visualization.GeoMap',
'columnchart':'google.visualization.ColumnChart',
'barchart':'google.visualization.BarChart',
'areachart':'google.visualization.AreaChart',
'annotatedtimeline':'google.visualization.AnnotatedTimeLine',
'termcloud':'TermCloud',
}

queries = {}

msettings.viswidgetmap=viswidgetmap

class Application(tornado.web.Application):
    def __init__(self):
        handlers = [
            (r"/getuserid", GetUserIdHandler),
            (r"/getuserprofiles", GetUserProfilesHandler),
            (r"/loaduserprofile", LoadUserProfileHandler),
            (r"/deleteuserprofile", DeleteUserProfileHandler),
            (r"/createnewprofile", CreateNewProfileHandler),
            (r"/getexampleprofiles", GetExampleProfilesHandler),
            (r"/loadexampleprofile", LoadExampleProfileHandler),
            (r"/uploadprofile", UploadProfileHandler),
            (r"/alreadyconcept", AlreadyConceptsHandler),
            (r"/uploadcontentfile", UploadContentFileHandler),
            (r"/updateconcept", UpdateConceptsHandler),
            (r"/getdocsamples", GetDocSamplesHandler),
            (r"/uploaddocuments", UploadDocumentsHandler),
            (r"/choosedocsample", ChooseDocSampleHandler),
            (r"/alreadydocuments", AlreadyDocumentsHandler),
            (r"/runmining", RunMiningHandler),
            (r"/preparesavedprofile", PrepareSavedProfileHandler),
            (r"/saveprofile", SaveProfileToDatabaseHandler),
            (r"/downloadprofile", DownloadProfileHandler),
            (r"/?$", madAppBarHandler),
            (r"/[^/]+/?$", madAppHandler),
            (r"/[^/]+/.+$", madAppDataHandler)
        ]
           

        settings = dict(
            template_path=os.path.join(os.path.dirname(__file__), "templates"),
            static_path=os.path.join(os.path.dirname(__file__), "static"),
            xsrf_cookies=False,
            cookie_secret=msettings.SECRET_KEY,
            login_url="/auth/login",
            debug=msettings.DEBUG
        )

        tornado.web.Application.__init__(self, handlers, **settings)

def auth_callback(request, realm, username, password):
    if username==msettings.USERNAME and password == msettings.PASSWORD:
        request.user_id = 1
        return True
    else:
        return False

def getNewUserId():
    return 'user{0}'.format(datetime.datetime.now().microsecond + (random.randrange(1, 100+1) * 100000))

def getNewProfileId():
    return 'profile{0}'.format(datetime.datetime.now().microsecond + (random.randrange(1, 100+1) * 100000))

def numberOfGrantsUploaded(user_id, cookie_set):
    if cookie_set and user_id:
        file_name = "/tmp/p%s.tsv" % (user_id)
        if os.path.isfile(file_name):
            num_lines = sum(1 for line in open(file_name))
            if str(num_lines) == cookie_set: 
                return num_lines
    return 0

def numberOfDocsUploaded(user_id):
    if user_id:
        file_name = "/tmp/docs%s.json" % (user_id)
        if os.path.isfile(file_name):
            num_lines = sum(1 for line in open(file_name))
            return num_lines
    return 0

def loadProfile(profileLocation, user_id):
    # extract data from profile file
    import sys
    sys.path.append(msettings.MADIS_PATH)
    import madis
    # get the profile database cursor
    cursor=madis.functions.Connection(profileLocation).cursor()

    # data to be sent
    data = {}
    # Write to csv file the grants ids
    if len([r for r in cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='grants'")]):
        cursor.execute("output '/tmp/p{0}.tsv' select c1,c2 from grants".format(user_id))
        # Get the number of grants uploaded
        file_name = "/tmp/p%s.tsv" % (user_id)
        if os.path.isfile(file_name):
            numberOfGrants = sum(1 for line in open(file_name))
        data['grants'] = numberOfGrants
    # write to json the poswords
    if len([r for r in cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='poswords'")]):
        results = [r for r in cursor.execute("select c1, c2 from poswords")]
        data['poswords'] = {value:key for value, key in results}
    # write to json the negwords
    if len([r for r in cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='negwords'")]):
        results = [r for r in cursor.execute("select c1, c2 from negwords")]
        data['negwords'] = {value:key for value, key in results}
    # write to json the filters
    if len([r for r in cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='filters'")]):
        results = [r for r in cursor.execute("select c1, c2 from filters")]
        for value, key in results:
            data[value] = key
        # data['filters'] = {value:key for value, key in results}
    cursor.close()
    return data

def deleteAllUserFiles(user_id):
    if user_id:
        file_name = "/tmp/p%s.tsv" % (user_id)
        if os.path.isfile(file_name):
            os.remove(file_name)
        file_name = "/tmp/docs%s.json" % (user_id)
        if os.path.isfile(file_name):
            os.remove(file_name)

def loadProfileDocs(user_id, profile_id):
    # copy unique profile docs file to a general user docs file
    docs_file_name = "/tmp/docs{0}.json".format(user_id)
    unique_profile_docs_file_name = "/tmp/OAMiningDocs_{0}_{1}.json".format(user_id,profile_id)
    if os.path.isfile(unique_profile_docs_file_name):
        copyfile(unique_profile_docs_file_name, docs_file_name)

def loadExampleDocs(user_id):
    sample_file = open("static/exampleDocs.txt", 'r')
    # write data to physical file
    cname = "/tmp/docs{0}.json".format(user_id)
    fh = open(cname, 'w')
    while 1:
        copy_buffer = sample_file.read(1048576)
        if not copy_buffer:
            break
        fh.write(copy_buffer)
    fh.close()
    lines_num = sum(1 for line in open(cname))

def loadExampleProfile(user_id):
    return loadProfile("static/exampleProfile.oamp", user_id)


class BaseHandler(ozhandler.DjangoErrorMixin, ozhandler.BasicAuthMixin, tornado.web.RequestHandler):
    def __init__(self, *args):
        tornado.web.RequestHandler.__init__(self, *args)
        if msettings.USERNAME!='':
            self.hiddenauthget=self.get
            self.get=self.authget
        if msettings.RESTRICT_IPS:
            self.hiddenget=self.get
            self.get=self.checkwhitelistget

    def authget(self, *args):
        try:
            if self.passwordless:
                self.hiddenauthget(*args)
                return
        except:
            pass
        
        if not self.get_authenticated_user(auth_callback, 'stats'):
            return False
        self.hiddenauthget(*args)

    def checkwhitelistget(self, *args):
        if self.request.remote_ip not in msettings.RESTRICT_IP_WHITELIST:
            raise tornado.web.HTTPError(403)
        return self.hiddenget(*args)

    def get_current_user(self):
        return 'anonymous'

    def executequery(self, query, bindings=None):
        def latinnum(x):
            x=int(x)
            lx=""
            while x>25:
                lx+=chr( ord('A')+int(x/25) )
                x%=25
            lx+=chr(ord('A')+x)
            return lx

        query=query.rstrip(';\n\s ')

        try:
            origvars=msettings.madis.functions.variables
            c=msettings.Connection.cursor().execute(query, localbindings=bindings)
        except Exception, e:
            try:
                c.close()
            except:
                pass
            msettings.madis.functions.variables=origvars
            self.finish(str(e))
            if msettings.DEBUG:
                raise e
            return

        # Schema from query's description
        try:
            schema=c.getdescription()
        except:
            c.close()
            msettings.madis.functions.variables=origvars
            self.finish()
            return

        colnames=[]
        coltypes=[]

        for cname, ctype in schema:
            if ctype==None:
                colnames+=[cname]
                coltypes+=[ctype]
                continue
            ctypehead3=ctype.lower()[0:3]
            if ctypehead3 in ('int', 'rea', 'flo', 'dou', 'num'):
                ctype='number'
            else:
                ctype='string'
            colnames+=[cname]
            coltypes+=[ctype]

        try:
            firstrow=c.next()
        except StopIteration:
            c.close()
            msettings.madis.functions.variables=origvars
            self.finish()
            return
        except Exception, e:
            c.close()
            msettings.madis.functions.variables=origvars
            self.finish(str(e))
            return

        # Merge with guessed schema from query's first row
        for cname, ctype, i in zip(colnames, coltypes, xrange(len(colnames))):
            if ctype==None:
                frtype=type(firstrow[i])
                if frtype in (int, float):
                    coltypes[i]='number'
                else:
                    coltypes[i]='string'

        # Write responce's header
        response={"cols":[]}
        for name, ctype,num in zip(colnames, coltypes, xrange(len(colnames))):
            id=latinnum(num)
            response["cols"]+=[{"id":id, "label":name,"type":ctype}]

        # Write header
        self.write(json.dumps(response, separators=(',', ':'), sort_keys=True, ensure_ascii=False)[0:-1] + ',"rows":[')

        # Write first line
        response=json.dumps({"c":[{"v":x} for x in firstrow]}, separators=(',', ':'), sort_keys=True, ensure_ascii=False)
        self.write(response)

        self.executequeryrow(c, msettings.madis.functions.variables)
        msettings.madis.functions.variables=origvars

    def executequeryrow(self, cursor, vars):
        try:
            try:
                origvars=msettings.madis.functions.variables
                msettings.madis.functions.variables=vars
                buffer=StringIO.StringIO()
                while buffer.len<30000:
                    buffer.write(','+json.dumps({"c":[{"v":x} for x in cursor.next()]}, separators=(',', ':'), sort_keys=True, ensure_ascii=False))
                self.write(buffer.getvalue())
                self.flush(callback=lambda : self.executequeryrow(cursor, msettings.madis.functions.variables))
            except StopIteration:
                cursor.close()
                self.finish(buffer.getvalue()+']}')
            finally:
                msettings.madis.functions.variables=origvars
        except IOError:
            msettings.madis.functions.variables=origvars
            cursor.close()
            pass

    def serveimage(self, path, mime_type=None):
        if os.path.sep != "/":
            path = path.replace("/", os.path.sep)
        abspath = os.path.abspath(os.path.join(self.settings['static_path'], path))

        if mime_type==None:
            mime_type='image/'+path[-3:]
        self.set_header("Content-Type", mime_type)

        # Check the If-Modified-Since, and don't send the result if the
        # content has not been modified
        ims_value = self.request.headers.get("If-Modified-Since")
        if ims_value is not None:
            date_tuple = email.utils.parsedate(ims_value)
            if_since = datetime.datetime.fromtimestamp(time.mktime(date_tuple))
            if if_since >= modified:
                self.set_status(304)
                return

        file = open(abspath, "rb")
        try:
            self.write(file.read())
        finally:
            file.close()
    
class HomeHandler(BaseHandler):
    def get(self):
        self.render("home.html", settings=msettings)

class madAppBarHandler(BaseHandler):
    def get(self):
        self.render('madappbar.html', apps=filteredapps, evals=filteredevals, settings=msettings)

trueset = set([1 , 'on', 'true', 'TRUE'])
URIdemultiplex = {r"/" + msettings.APPDIRNAME + "/analyze":'projects'
             , r"/" + msettings.APPDIRNAME + "/datacitations":'datacitations'
             , r"/" + msettings.APPDIRNAME + "/classifier":'classification'
             , r"/" + msettings.APPDIRNAME + "/pdbs":'pdb'
             , r"/" + msettings.APPDIRNAME + "/interactivemining":'interactivemining'}


class GetUserIdHandler(BaseHandler):
    passwordless=True
    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "http://localhost:4200")
        self.set_header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
        self.set_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.set_header('Access-Control-Allow-Credentials', 'true')
        self.set_header('Content-Type', 'application/json')
    def options(self):
        # no body
        self.set_status(204)
        self.finish()
    def get(self):
        try:
            # check if we already gave client a user_id, and it exists on the server
            user_id = self.get_secure_cookie('madgikmining')
            database_file_name = "/tmp/OAMiningProfilesDatabase_{0}.db".format(user_id)
            if user_id is None or not os.path.isfile(database_file_name):
                # give him a unique user_id
                user_id = getNewUserId()
                self.set_secure_cookie('madgikmining', user_id)
                # create a database where the user stores his profiles info
                import sys
                sys.path.append(msettings.MADIS_PATH)
                import madis
                # get the database cursor
                database_file_name = "/tmp/OAMiningProfilesDatabase_{0}.db".format(user_id)
                cursor=madis.functions.Connection(database_file_name).cursor()
                # Create database table
                cursor.execute("drop table if exists database", parse=False)
                cursor.execute("create table database(id,name,datecreated,status,matches,docname,docsnumber)", parse=False)
                cursor.close()
            self.write({'user_id': user_id})
            self.finish()
        except Exception as ints:
            self.set_status(400)
            self.write("A server error occurred, please contact administrator!")
            self.finish()
            print ints
            return


class GetUserProfilesHandler(BaseHandler):
    passwordless=True
    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "http://localhost:4200")
        self.set_header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
        self.set_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.set_header('Access-Control-Allow-Credentials', 'true')
        self.set_header('Content-Type', 'application/json')
    def options(self):
        # no body
        self.set_status(204)
        self.finish()
    def get(self):
        try:
            # get user id from cookie. Must have
            user_id = self.get_secure_cookie('madgikmining')
            if user_id is None:
                self.set_status(400)
                self.write("Missing cookie containing user's id...")
                return
            # extract data from database
            import sys
            sys.path.append(msettings.MADIS_PATH)
            import madis
            # database file name
            database_file_name = "/tmp/OAMiningProfilesDatabase_{0}.db".format(user_id)
            if not os.path.isfile(database_file_name):
                self.set_status(400)
                self.write("Missing user\'s database")
                return
            # get the database cursor
            cursor=madis.functions.Connection(database_file_name).cursor()
            # data to be sent
            data = {}
            user_profiles = []
            for r in cursor.execute("SELECT id,name,datecreated,status,matches,docname FROM database order by rowid desc"):
                user_profiles.append({"id":r[0], "name": r[1], "datecreated": r[2], "status": r[3], "matches": r[4], "docname": r[5]})
                data['profiles'] = user_profiles
            cursor.close()
            self.write(json.dumps(data))
            self.finish()
        except Exception as ints:
            self.set_status(400)
            self.write("A server error occurred, please contact administrator!")
            self.finish()
            print ints
            return


class LoadUserProfileHandler(BaseHandler):
    passwordless=True
    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "http://localhost:4200")
        self.set_header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
        self.set_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.set_header('Access-Control-Allow-Credentials', 'true')
        self.set_header('Content-Type', 'application/json')
    def options(self):
        # no body
        self.set_status(204)
        self.finish()
    def post(self):
        try:
            # get user id from cookie. Must have
            user_id = self.get_secure_cookie('madgikmining')
            if user_id is None:
                self.set_status(400)
                self.write("Missing cookie containing user's id...")
                return
            # get data
            profile_id = json.loads(self.request.body)['id']
            # delete profile from database
            import sys
            sys.path.append(msettings.MADIS_PATH)
            import madis
            # database file name
            database_file_name = "/tmp/OAMiningProfilesDatabase_{0}.db".format(user_id)
            # get the database cursor
            cursor=madis.functions.Connection(database_file_name).cursor()
            # check if this profile exists
            profile_data = [r for r in cursor.execute('select docname,docsnumber from database where id="{0}"'.format(profile_id))]
            if len(profile_data) == 0:
                self.set_status(400)
                self.write("There is no profile with this name")
                cursor.close()
                return
            cursor.close()
            # check if profile file exists on the disk
            file_name = "/tmp/OAMiningProfile_%s_%s.oamp" % (user_id,profile_id)
            if not os.path.isfile(file_name):
                self.set_status(400)
                self.write("There is no profile file with this name")
                return
            # reset everything
            deleteAllUserFiles(user_id)
            loadProfileDocs(user_id,profile_id)
            data = loadProfile(file_name, user_id)
            data['docname'] = profile_data[0][0]
            data['docsnumber'] = profile_data[0][1]
            self.set_secure_cookie('madgikmining_grantsuploaded', str(data['grants']))
            self.write(json.dumps(data))
            self.finish()
        except Exception as ints:
            self.set_status(400)
            self.write("A server error occurred, please contact administrator!")
            self.finish()
            print ints
            return


class DeleteUserProfileHandler(BaseHandler):
    passwordless=True
    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "http://localhost:4200")
        self.set_header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
        self.set_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.set_header('Access-Control-Allow-Credentials', 'true')
        self.set_header('Content-Type', 'application/json')
    def options(self):
        # no body
        self.set_status(204)
        self.finish()
    def post(self):
        try:
            # get user id from cookie. Must have
            user_id = self.get_secure_cookie('madgikmining')
            if user_id is None:
                self.set_status(400)
                self.write("Missing cookie containing user's id...")
                return
            # get data
            profile_id = json.loads(self.request.body)['id']
            # delete profile from database
            import sys
            sys.path.append(msettings.MADIS_PATH)
            import madis
            # database file name
            database_file_name = "/tmp/OAMiningProfilesDatabase_{0}.db".format(user_id)
            # get the database cursor
            cursor=madis.functions.Connection(database_file_name).cursor()
            # data to be sent
            cursor.execute('delete from database where id="{0}"'.format(profile_id), parse=False)
            cursor.close()
            # delete profile from disk
            file_name = "/tmp/OAMiningProfile_%s_%s.oamp" % (user_id,profile_id)
            if os.path.isfile(file_name):
                os.remove(file_name)
            self.write(json.dumps({}))
            self.finish()
        except Exception as ints:
            self.set_status(400)
            self.write("A server error occurred, please contact administrator!")
            self.finish()
            print ints
            return


class GetExampleProfilesHandler(BaseHandler):
    passwordless=True
    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "http://localhost:4200")
        self.set_header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
        self.set_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.set_header('Access-Control-Allow-Credentials', 'true')
        self.set_header('Content-Type', 'application/json')
    def options(self):
        # no body
        self.set_status(204)
        self.finish()
    def get(self):
        try:
            data = {}
            example_profiles = []
            example_profiles.append({'name': 'Egi', 'contents': 25, 'documents': 104})
            example_profiles.append({'name': 'Fbi', 'contents': 66, 'documents': 1023})
            example_profiles.append({'name': 'NSF', 'contents': 263, 'documents': 140})
            example_profiles.append({'name': 'Swiss', 'contents': 4, 'documents': 502})
            data['profiles'] = example_profiles
            self.write(json.dumps(data))
            self.finish()
        except Exception as ints:
            self.set_status(400)
            self.write("A server error occurred, please contact administrator!")
            self.finish()
            print ints
            return


class CreateNewProfileHandler(BaseHandler):
    passwordless=True
    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "http://localhost:4200")
        self.set_header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
        self.set_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.set_header('Access-Control-Allow-Credentials', 'true')
        self.set_header('Content-Type', 'application/json')
    def options(self):
        # no body
        self.set_status(204)
        self.finish()
    def get(self):
        try:
            # get user id from cookie. Must have
            user_id = self.get_secure_cookie('madgikmining')
            if user_id is None:
                self.set_status(400)
                self.write("Missing cookie containing user's id...")
                return
            deleteAllUserFiles(user_id)
            self.write(json.dumps({}))
            self.finish()
        except Exception as ints:
            self.set_status(400)
            self.write("A server error occurred, please contact administrator!")
            self.finish()
            print ints
            return


class LoadExampleProfileHandler(BaseHandler):
    passwordless=True
    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "http://localhost:4200")
        self.set_header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
        self.set_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.set_header('Access-Control-Allow-Credentials', 'true')
        self.set_header('Content-Type', 'application/json')
    def options(self):
        # no body
        self.set_status(204)
        self.finish()
    def get(self):
        try:
            # get user id from cookie. Must have
            user_id = self.get_secure_cookie('madgikmining')
            if user_id is None:
                self.set_status(400)
                self.write("Missing cookie containing user's id...")
                return
            # reset everything
            deleteAllUserFiles(user_id)
            # load example data
            loadExampleDocs(user_id)
            data = loadExampleProfile(user_id)
            data['docname'] = 'Example'
            data['docsnumber'] = '26'
            self.set_secure_cookie('madgikmining_grantsuploaded', str(data['grants']))
            self.write(json.dumps(data))
            self.finish()
        except Exception as ints:
            self.set_status(400)
            self.write("A server error occurred, please contact administrator!")
            self.finish()
            print ints
            return


class UploadProfileHandler(BaseHandler):
    passwordless=True
    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "http://localhost:4200")
        self.set_header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
        self.set_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.set_header('Access-Control-Allow-Credentials', 'true')
        self.set_header('Content-Type', 'application/json')
    def options(self):
        # no body
        self.set_status(204)
        self.finish()
    def post(self):
        try:
            # get user id from cookie. Must have
            user_id = self.get_secure_cookie('madgikmining')
            if user_id is None:
                self.set_status(400)
                self.write("Missing cookie containing user's id...")
                return
            # get file info and body from post data
            fileinfo = self.request.files['upload'][0]
            fname = fileinfo['filename']
            extn = os.path.splitext(fname)[1]
            # must be .pdf or .json
            if extn != ".oamp":
                self.write(json.dumps({'respond': "<b style=\"color: red\">File must be .oamp compatible profile</b>"}))
                return
            # write data to physical file
            cname = "/tmp/profile{0}.oamp".format(user_id)
            fh = open(cname, 'w')
            fh.write(fileinfo['body'])
            fh.close()
            data = loadProfile(cname, user_id)
            self.set_secure_cookie('madgikmining_grantsuploaded', str(data['grants']))
            self.write(json.dumps(data))
            self.finish()
        except Exception as ints:
            self.set_status(400)
            self.write("A server error occurred, please contact administrator!")
            self.finish()
            print ints
            return


class AlreadyConceptsHandler(BaseHandler):
    passwordless=True
    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "http://localhost:4200")
        self.set_header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
        self.set_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.set_header('Access-Control-Allow-Credentials', 'true')
        self.set_header('Content-Type', 'application/json')
    def options(self):
        # no body
        self.set_status(204)
        self.finish()
    def get(self):
        try:
            # get user id from cookie. Must have
            user_id = self.get_secure_cookie('madgikmining')
            if user_id is None:
                self.set_status(400)
                self.write("Missing cookie containing user's id...")
                return
            data = {}
            data['data'] = {}
            file_name = "/tmp/p%s.tsv" % (user_id)
            if os.path.isfile(file_name):
                codes = {}
                num_lines = 0
                for line in open(file_name):
                    columns = re.split(r'\t+', line.rstrip('\t\n\r'))
                    if len(columns) and columns[0] == '':
                        continue
                    elif len(columns) > 1:
                        codes[columns[0]] = columns[1]
                    elif len(columns) == 1:
                        codes[columns[0]] = ''
                    num_lines += 1
                cookie = self.get_secure_cookie('madgikmining_grantsuploaded')
                if cookie and str(num_lines) == cookie:
                    data['data'] = codes
            self.write(json.dumps(data))
            self.finish()
        except Exception as ints:
            self.set_status(400)
            self.write("A server error occurred, please contact administrator!")
            self.finish()
            print ints
            return


class UploadContentFileHandler(BaseHandler):
    passwordless=True
    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "http://localhost:4200")
        self.set_header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
        self.set_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.set_header('Access-Control-Allow-Credentials', 'true')
        self.set_header('Content-Type', 'application/json')
    def options(self):
        # no body
        self.set_status(204)
        self.finish()
    def post(self):
        try:
            # get user id from cookie. Must have
            user_id = self.get_secure_cookie('madgikmining')
            if user_id is None:
                self.set_status(400)
                self.write("Missing cookie containing user's id...")
                return
            # get file info and body from post data
            fileinfo = self.request.files['upload'][0]
            fname = fileinfo['filename']
            extn = os.path.splitext(fname)[1]
            # must be .pdf or .json
            if extn != ".tsv" and extn != ".txt":
                self.set_status(400)
                self.write("File must be .tsv or .txt...")
                return
            codes = {}
            lines = fileinfo['body'].splitlines()
            for line in lines:
                columns = re.split(r'\t+', line.rstrip('\t\n\r'))
                if len(columns) and columns[0] == '':
                    continue
                elif len(columns) > 1:
                    codes[columns[0]] = columns[1]
                elif len(columns) == 1:
                    codes[columns[0]] = ''
            # data to be sent
            data = {}
            if len(lines) == 1:
                data['error'] = "File <b>{0}</b> uploaded.<br><b>1 Code</b> loaded! <i>Please make sure that you separate each code with newline!</i>".format(fname)
            else:
                data['data'] = codes
                data['respond'] = "<b>{0} Codes</b> loaded successfully!".format(len(lines))
                self.set_secure_cookie('madgikmining_grantsuploaded', str(len(lines)))
            self.write(json.dumps(data))
            self.finish()
        except Exception as ints:
            self.set_status(400)
            self.write("A server error occurred, please contact administrator!")
            self.finish()
            print ints
            return


class UpdateConceptsHandler(BaseHandler):
    passwordless=True
    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "http://localhost:4200")
        self.set_header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
        self.set_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.set_header('Access-Control-Allow-Credentials', 'true')
        self.set_header('Content-Type', 'application/json')
    def options(self):
        # no body
        self.set_status(204)
        self.finish()
    def post(self):
        try:
            # get user id from cookie. Must have
            user_id = self.get_secure_cookie('madgikmining')
            if user_id is None:
                self.set_status(400)
                self.write("Missing cookie containing user's id...")
                return
            # get data
            concepts = json.loads(json.loads(self.request.body)['concepts'])
            # write data to physical file
            cname = "/tmp/p{0}.tsv".format(user_id)
            fh = open(cname, 'w')
            concepts_len = 0
            for key, value in concepts.iteritems():
                if key == '':
                    continue
                concepts_len += 1
                fh.write("{0}\t{1}\n".format(key,value))
            fh.close()
            # data to be sent
            data = {}
            if concepts_len == 0:
                self.set_status(400)
                self.write("You have to provide at least one concept to continue!")
                return
            else:
                data['respond'] = "<b>{0} Codes</b> loaded successfully!".format(concepts_len)
                self.set_secure_cookie('madgikmining_grantsuploaded', str(concepts_len))
            self.write(json.dumps(data))
            self.finish()
        except Exception as ints:
            self.set_status(400)
            self.write("A server error occurred, please contact administrator!")
            self.finish()
            print ints
            return


class GetDocSamplesHandler(BaseHandler):
    passwordless=True
    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "http://localhost:4200")
        self.set_header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
        self.set_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.set_header('Access-Control-Allow-Credentials', 'true')
        self.set_header('Content-Type', 'application/json')
    def options(self):
        # no body
        self.set_status(204)
        self.finish()
    def get(self):
        try:
            # get user id from cookie. Must have
            user_id = self.get_secure_cookie('madgikmining')
            if user_id is None:
                self.set_status(400)
                self.write("Missing cookie containing user's id...")
                return
            data = {}
            doc_samples = []
            doc_samples.append({'name': 'Egi', 'documents': 104})
            doc_samples.append({'name': 'Fbi', 'documents': 1023})
            doc_samples.append({'name': 'NSF', 'documents': 140})
            doc_samples.append({'name': 'Swiss', 'documents': 502})
            doc_samples.append({'name': 'Egi', 'documents': 104})
            doc_samples.append({'name': 'Fbi', 'documents': 1023})
            doc_samples.append({'name': 'NSF', 'documents': 140})
            doc_samples.append({'name': 'Swiss', 'documents': 502})
            doc_samples.append({'name': 'Egi', 'documents': 104})
            doc_samples.append({'name': 'Fbi', 'documents': 1023})
            doc_samples.append({'name': 'NSF', 'documents': 140})
            doc_samples.append({'name': 'Swiss', 'documents': 502})
            doc_samples.append({'name': 'Egi', 'documents': 104})
            doc_samples.append({'name': 'Fbi', 'documents': 1023})
            doc_samples.append({'name': 'NSF', 'documents': 140})
            doc_samples.append({'name': 'Swiss', 'documents': 502})
            data['documents'] = doc_samples
            self.write(json.dumps(data))
            self.finish()
        except Exception as ints:
            self.set_status(400)
            self.write("A server error occurred, please contact administrator!")
            self.finish()
            print ints
            return


class UploadDocumentsHandler(BaseHandler):
    passwordless=True
    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "http://localhost:4200")
        self.set_header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
        self.set_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.set_header('Access-Control-Allow-Credentials', 'true')
        self.set_header('Content-Type', 'application/json')
    def options(self):
        # no body
        self.set_status(204)
        self.finish()
    def post(self):
        try:
            # get user id from cookie. Must have
            user_id = self.get_secure_cookie('madgikmining')
            if user_id is None:
                self.set_status(400)
                self.write("Missing cookie containing user's id...")
                return
            fileinfo = self.request.files['upload'][0]
            fname = fileinfo['filename']
            extn = os.path.splitext(fname)[1]
            # data to be sent
            data = {}
            # must be .pdf, .txt or .json
            if extn != ".pdf" and extn != ".txt" and extn != ".json":
                self.set_status(400)
                self.write("File must be .pdf, .json or .txt")
                return
                return
            # write data to physical file
            cname = "/tmp/docs{0}{1}".format(user_id, extn)
            fh = open(cname, 'w')
            fh.write(fileinfo['body'])
            fh.close()
            # Convert pdf to txt and then to json format
            if extn == ".pdf":
                import subprocess as sub
                p = sub.Popen(['pdftotext', '-enc', 'UTF-8', cname],stdout=sub.PIPE,stderr=sub.PIPE)
                output, errors = p.communicate()
                if errors:
                    self.set_status(400)
                    self.write("An error occurred when trying to convert .pdf to .txt...")
                    return
                os.remove(cname)
                cname = "/tmp/docs{0}.txt".format(user_id)
                with open(cname, 'r') as fin:
                    docData=fin.read().replace('\n', ' ')
                    if len(docData)==0:
                        self.set_status(400)
                        self.write("An error occurred when trying to convert .pdf to text...")
                        return
                with open("/tmp/docs{0}.json".format(user_id), "wb") as fout:
                    json.dump({"text":docData,"id":os.path.splitext(fname)[0]}, fout)
                os.remove(cname)
            # else check if txt is in correct json format
            elif extn == ".txt" or extn == ".json":
                try:
                    jsonlist = []
                    for line in open(cname, 'r'):
                        jsonlist.append(json.loads(line))
                    os.rename(cname, "/tmp/docs{0}.json".format(user_id))
                except ValueError, e:
                    self.set_status(400)
                    self.write("File is not in a valid json format...")
                    os.remove(cname)
                    print e
                    return
            file_name = "/tmp/docs%s.json" % (user_id)
            if os.path.isfile(file_name):
                lines = sum(1 for line in open(file_name))
                data['respond'] = "<b>{0} Documents</b> loaded successfully!".format(lines)
                data['data'] = lines
            self.write(json.dumps(data))
            self.finish()
        except Exception as ints:
            self.set_status(400)
            self.write("A server error occurred, please contact administrator!")
            self.finish()
            print ints
            return


class ChooseDocSampleHandler(BaseHandler):
    passwordless=True
    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "http://localhost:4200")
        self.set_header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
        self.set_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.set_header('Access-Control-Allow-Credentials', 'true')
        self.set_header('Content-Type', 'application/json')
    def options(self):
        # no body
        self.set_status(204)
        self.finish()
    def post(self):
        try:
            # get user id from cookie. Must have
            user_id = self.get_secure_cookie('madgikmining')
            if user_id is None:
                self.set_status(400)
                self.write("Missing cookie containing user's id...")
                return
            doc_sample = json.loads(self.request.body)['docsample']
            if doc_sample == '':
                self.set_status(400)
                self.write("A doc sample name must be provided")
                return
            sample_file_name = ""
            if doc_sample == "Egi":
                sample_file_name = "static/egi_sample.tsv"
            elif doc_sample == "Rcuk":
                sample_file_name = "static/rcuk_sample.tsv"
            elif doc_sample == "Arxiv":
                sample_file_name = "static/arxiv_sample.tsv"
            else:
                self.set_status(400)
                self.write("No Doc sample with this name")
                return
            sample_file = open(sample_file_name, 'r')
            # write data to physical file
            cname = "/tmp/docs{0}.json".format(user_id)
            fh = open(cname, 'w')
            while 1:
                copy_buffer = sample_file.read(1048576)
                if not copy_buffer:
                    break
                fh.write(copy_buffer)
            fh.close()
            lines_num = sum(1 for line in open(cname))
            
            # data to be sent
            data = {}
            if lines_num == 0:
                self.set_status(400)
                self.write("File must contain atleast one document...")
                return
            else:
                data['respond'] = "<b>{0} Documents</b> loaded successfully!".format(lines_num)
                data['data'] = lines_num
            self.write(json.dumps(data))
            self.finish()
        except Exception as ints:
            self.set_status(400)
            self.write("A server error occurred, please contact administrator!")
            self.finish()
            print ints
            return


class AlreadyDocumentsHandler(BaseHandler):
    passwordless=True
    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "http://localhost:4200")
        self.set_header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
        self.set_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.set_header('Access-Control-Allow-Credentials', 'true')
        self.set_header('Content-Type', 'application/json')
    def options(self):
        # no body
        self.set_status(204)
        self.finish()
    def get(self):
        try:
            # get user id from cookie. Must have
            user_id = self.get_secure_cookie('madgikmining')
            if user_id is None:
                self.set_status(400)
                self.write("Missing cookie containing user's id...")
                return
            data = {}
            if msettings.RESET_FIELDS == 1:
                data['data'] = -1
            else:
                data['data'] = 0
            file_name = "/tmp/docs%s.json" % (user_id)
            if os.path.isfile(file_name):
                data['data'] = sum(1 for line in open(file_name))
            msettings.RESET_FIELDS = 0
            self.write(json.dumps(data))
            self.finish()
        except Exception as ints:
            self.set_status(400)
            self.write("A server error occurred, please contact administrator!")
            self.finish()
            print ints
            return


class RunMiningHandler(BaseHandler):
    passwordless=True
    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "http://localhost:4200")
        self.set_header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
        self.set_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.set_header('Access-Control-Allow-Credentials', 'true')
        self.set_header('Content-Type', 'application/json')
    def options(self):
        # no body
        self.set_status(204)
        self.finish()
    def post(self):
        try:
            # get user id from cookie. Must have
            user_id = self.get_secure_cookie('madgikmining')
            if user_id is None:
                self.set_status(400)
                self.write("Missing cookie containing user's id...")
                return
            request_arguments = json.loads(self.request.body)
            print request_arguments
            # get the database cursor
            cursor=msettings.Connection.cursor()
            # data to be sent
            data = {}
            # set the textwindow size
            extracontextprev = 10
            extracontextnext = 10
            contextprev = 10
            contextnext = 5
            # Automatically find middle size from grant codes white spaces
            querygrantsize = "select max(p1) from (select regexpcountwords('\s',stripchars(p1)) as p1 from (setschema 'p1,p2' file '/tmp/p{0}.tsv' dialect:tsv))".format(user_id)
            contextmiddle = [r for r in cursor.execute(querygrantsize)][0][0]+1
            if 'contextprev' in request_arguments and request_arguments['contextprev'] != '':
                contextprev = int(request_arguments['contextprev'])
                if contextprev < 0 or contextprev > 20:
                    self.set_status(400)
                    self.write("Context size must be in its limits...")
                    return
            if 'contextnext' in request_arguments and request_arguments['contextnext'] != '':
                contextnext = int(request_arguments['contextnext'])
                if contextnext < 0 or contextnext > 20:
                    self.set_status(400)
                    self.write("Context size must be in its limits...")
                    return
            j2sextraprev = "j2s(prev1"
            for cnt in xrange(2,extracontextprev+1):
                j2sextraprev += ",prev"+str(cnt)
            j2sextraprev += ")"
            j2sprev = ""
            j2scontext = "("
            if contextprev:
                j2scontext = "j2s(prev"+str(extracontextprev+1)
                j2sprev = "j2s(prev"+str(extracontextprev+1)
                for cnt in xrange(extracontextprev+2,extracontextprev+contextprev+1):
                    j2sprev += ",prev"+str(cnt)
                    j2scontext += ",prev"+str(cnt)
                j2sprev += ")"
                j2scontext += ","
            else:
                j2scontext = "j2s("
            j2snext = "j2s(next1"
            j2scontext += "middle"
            if contextnext:
                j2scontext += ",next1"
                for cnt in xrange(2,contextnext+1):
                    j2snext += ",next"+str(cnt)
                    j2scontext += ",next"+str(cnt)
                j2snext += ")"
            j2scontext += ")"
            j2sextranext = "j2s(next"+str(contextnext+1)
            for cnt in xrange(contextnext+2,extracontextnext+contextnext+1):
                j2sextranext += ",next"+str(cnt)
            j2sextranext += ")"
            print j2sextraprev, j2sprev, j2snext, j2sextranext, j2scontext

            # create positive and negative words weighted regex text
            pos_set = neg_set = conf = whr_conf = ''
            if 'poswords' in request_arguments and request_arguments['poswords'] != '{}':
                data['poswords'] = []
                # construct math string for positive words matching calculation with weights
                pos_words = json.loads(request_arguments['poswords'])
                for key, value in pos_words.iteritems():
                    # MONO GIA TO EGI
                    pos_set += r'regexpcountuniquematches("%s",%s)*%s + ' % (key,j2scontext,value)
                    # ORIGINAL
                    # pos_set += r'regexpcountuniquematches("(?:\b)%s(?:\b)",j2s(prev,middle,next))*%s + ' % (key,value)
                    data['poswords'].append(key)
                pos_set += "0"
            if 'negwords' in request_arguments and request_arguments['negwords'] != '{}':
                data['negwords'] = []
                # construct math string for negative words matching calculation with weights
                neg_words = json.loads(request_arguments['negwords'])
                for key, value in neg_words.iteritems():
                    # MONO GIA TO EGI
                    neg_set += r'regexpcountuniquematches("%s",%s)*%s + ' % (key,j2scontext,value)
                    # ORIGINAL
                    # neg_set += r'regexpcountuniquematches("(?:\b)%s(?:\b)",j2s(prev,middle,next))*%s - ' % (key,value)
                    data['negwords'].append(key)
                neg_set += "0"
            if pos_set != '' and neg_set != '':
                conf = ", ({0} - {1})".format(pos_set, neg_set)
            elif pos_set != '':
                conf = ", {0}".format(pos_set)
            elif neg_set != '':
                conf = ", -{0}".format(neg_set)
            if conf != '':
                conf += ' as conf'
                whr_conf = 'and conf>=0'

            if numberOfDocsUploaded(user_id) != 0:
                doc_filters = "comprspaces(regexpr('[\n|\r]',d2,' '))"
                ackn_filters = "comprspaces(regexpr(\"\\'\", p2,''))"
                if 'punctuation' in request_arguments and request_arguments['punctuation'] == "1":
                    doc_filters = 'keywords('+doc_filters+')'
                    ackn_filters = 'keywords('+ackn_filters+')'
                if 'lettercase' in request_arguments and request_arguments['lettercase'] != '' and request_arguments['lettercase'] != 'none':
                    if request_arguments['lettercase'] == 'lowercase':
                        doc_filters = 'lower('+doc_filters+')'
                        ackn_filters = 'lower('+ackn_filters+')'
                    elif request_arguments['lettercase'] == 'uppercase':
                        doc_filters = 'upper('+doc_filters+')'
                        ackn_filters = 'upper('+ackn_filters+')'
                if 'stopwords' in request_arguments and request_arguments['stopwords'] == "1":
                    doc_filters = 'filterstopwords('+doc_filters+')'
                    ackn_filters = 'filterstopwords('+ackn_filters+')'
                print "DOCCC", doc_filters
                list(cursor.execute("drop table if exists grantstemp"+user_id, parse=False))
                query_pre_grants = "create temp table grantstemp{0} as select stripchars(p1) as gt1, case when p2 is null then null else {1} end as gt2 from (setschema 'p1,p2' file '/tmp/p{0}.tsv' dialect:tsv)".format(user_id, ackn_filters)
                cursor.execute(query_pre_grants)
                list(cursor.execute("drop table if exists docs"+user_id, parse=False))
                query1 = "create temp table docs{0} as select d1, {1} as d2 from (setschema 'd1,d2' select jsonpath(c1, '$.id', '$.text') from (file '/tmp/docs{0}.json'))".format(user_id, doc_filters)
                cursor.execute(query1)
            else:
                self.set_status(400)
                self.write("You have to provide atleast 1 document...")
                return

            list(cursor.execute("drop table if exists grants"+user_id, parse=False))
            # string concatenation workaround because of the special characters conflicts
            if 'wordssplitnum' in request_arguments and request_arguments['wordssplitnum'] != '':
                words_split = int(request_arguments['wordssplitnum'])
                # MONO GIA TO EGI
                if 0 < words_split and words_split <= 10:
                    acknowledgment_split = r'textwindow2s(gt2,0,'+str(words_split)+r',0)'
                else:
                    acknowledgment_split = r'"dummy" as prev, gt2 as middle, "dummy" as next'
                # ORIGINAL
                # if 0 < words_split and words_split <= 10:
                #     acknowledgment_split = r'textwindow2s(regexpr("([\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|])", gt2, "\\\1"),0,'+str(words_split)+r',0)'
                # else:
                #     acknowledgment_split = r'"dummy" as prev, regexpr("([\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|])", gt2, "\\\1") as middle, "dummy" as next'

                # query0 = r"create temp table grants"+user_id+r' as select gt1 as g1, jmergeregexp(jgroup("(?<=[\s\b])"||middle||"(?=[\s\b])")) as g2 from '+r"(setschema 'gt1,prev,middle,next' select gt1, "+acknowledgment_split+r' from grantstemp'+user_id+r' where (gt1 or gt1!="") and gt2 not null) group by gt1 union all select distinct gt1 as g1, "(?!.*)" as g2 from grantstemp'+user_id+r" where (gt1 or gt1!='') and gt2 is null"
                query0 = r"create temp table grants"+user_id+r' as select gt1 as g1, jmergeregexp(jgroup(middle)) as g2 from '+r"(setschema 'gt1,prev,middle,next' select gt1, "+acknowledgment_split+r' from grantstemp'+user_id+r' where (gt1 or gt1!="") and gt2 != "") group by gt1 union all select distinct gt1 as g1, "(?!.*)" as g2 from grantstemp'+user_id+r" where (gt1 or gt1!='') and gt2 = ''"
                cursor.execute(query0)
                query0get = "select * from grants{0}".format(user_id)
                results0get = [r for r in cursor.execute(query0get)]
                print results0get

            # FOR EGI ONLY
            query2 = r'select distinct d1, g1, extraprev, prev, middle, next, extranext, acknmatch, max(confidence) as confidence from (select d1, g1, regexpcountuniquematches(g2, '+j2scontext+r') as confidence, stripchars('+j2sextraprev+r') as extraprev, stripchars('+j2sprev+r') as prev, middle, stripchars('+j2snext+r') as next, stripchars('+j2sextranext+r') as extranext, '+j2scontext+r' as context, regexprfindall(g2, '+j2scontext+r') as acknmatch '+conf+r' from (select d1, textwindow(d2,'+str(extracontextprev+contextprev)+r','+str(extracontextnext+contextnext)+r','+str(contextmiddle)+r') from docs'+user_id+r'), (select g1, g2 from grants'+user_id+r') T where regexprmatches("(\b|\d|\W)"||T.g1||"(\b|\d|\W)",middle) '+whr_conf+r') group by d1'
            # ORIGINAL
            # query2 = "select d1, g1, context, acknmatch, max(confidence) as confidence from (select d1, g1, regexpcountuniquematches(g2, j2s(prev,middle,next)) as confidence, j2s(prev,middle,next) as context, regexprfindall(g2, j2s(prev,middle,next)) as acknmatch {0} from (select d1, textwindow2s(d2,20,{3},20) from docs{1}), (select g1, g2 from grants{1}) T where regexprmatches(T.g1,middle) {2}) group by d1".format(conf, user_id, whr_conf, contextmiddle)

            # OLD ONE
            # query2 = "select c1, c3 {0} from (select c1, textwindow2s(c2,10,1,5) from (select * from docs{1})), (select c3 from grants{1}) T where middle = T.c3 {2}".format(conf, user_id, whr_conf)
            results = [r for r in cursor.execute(query2)]
            print results
            doctitles = {}
            for r in results:
                if r[0] not in doctitles:
                    doctitles[r[0]] = []
                doctitles[r[0]].append({"match": r[1], "extraprev": r[2], "prev": r[3], "middle": r[4], "next":r[5],  "extranext":r[6], "acknmatch": json.loads(r[7]), "confidence": r[8]})
            data['matches'] = doctitles
            data['respond'] = "Matching results updated!"
            self.write(json.dumps(data))
            self.flush()
            self.finish()
        except Exception as ints:
            self.set_status(400)
            self.write("A server error occurred, please contact administrator!")
            self.finish()
            print ints
            return


class PrepareSavedProfileHandler(BaseHandler):
    passwordless=True
    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "http://localhost:4200")
        self.set_header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
        self.set_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.set_header('Access-Control-Allow-Credentials', 'true')
        self.set_header('Content-Type', 'application/json')
    def options(self):
        # no body
        self.set_status(204)
        self.finish()
    def post(self):
        try:
            # get user id from cookie. Must have
            user_id = self.get_secure_cookie('madgikmining')
            if user_id is None:
                self.set_status(400)
                self.write("Missing cookie containing user's id...")
                return
            import sys
            sys.path.append(msettings.MADIS_PATH)
            import madis
            # get the database cursor
            # profile file name
            profile_file_name = "/tmp/OAMiningProfile_{0}.oamp".format(user_id)
            cursor=madis.functions.Connection(profile_file_name).cursor()
            # Create poswords table
            cursor.execute("drop table if exists poswords", parse=False)
            cursor.execute("create table poswords(c1,c2)", parse=False)
            # Create negwords table
            cursor.execute("drop table if exists negwords", parse=False)
            cursor.execute("create table negwords(c1,c2)", parse=False)
            # Create filters table
            cursor.execute("drop table if exists filters", parse=False)
            cursor.execute("create table filters(c1,c2)", parse=False)
            # Create grants table
            cursor.execute("drop table if exists grants", parse=False)
            cursor.execute("create table grants(c1,c2)", parse=False)
            request_arguments = json.loads(self.request.body)
            if 'poswords' in request_arguments and request_arguments['poswords'] != '{}':
                # construct math string for positive words matching calculation with weights
                pos_words = json.loads(request_arguments['poswords'])
                cursor.executemany("insert into poswords(c1,c2) values(?,?)",
                          (
                                (key, value,) for key, value in pos_words.iteritems()
                          )
                )
            if 'negwords' in request_arguments and request_arguments['negwords'] != '{}':
                # construct math string for negative words matching calculation with weights
                neg_words = json.loads(request_arguments['negwords'])
                cursor.executemany("insert into negwords(c1,c2) values(?,?)",
                          (
                                (key, value,) for key, value in neg_words.iteritems()
                          )
                )
            filters = {}
            if 'contextprev' in request_arguments and request_arguments['contextprev'] != '':
                filters['contextprev'] = request_arguments['contextprev']
            if 'contextnext' in request_arguments and request_arguments['contextnext'] != '':
                filters['contextnext'] = request_arguments['contextnext']
            if 'lettercase' in request_arguments and request_arguments['lettercase'] != '':
                filters['lettercase'] = request_arguments['lettercase']
            if 'wordssplitnum' in request_arguments and request_arguments['wordssplitnum'] != '':
                filters['wordssplitnum'] = request_arguments['wordssplitnum']
            if 'stopwords' in request_arguments and request_arguments['stopwords'] != '':
                filters['stopwords'] = request_arguments['stopwords']
            if 'stopwords' in request_arguments and request_arguments['stopwords'] != '':
                filters['punctuation'] = request_arguments['punctuation']
            cursor.executemany("insert into filters(c1,c2) values(?,?)",
                      (
                            (key, value,) for key, value in filters.iteritems()
                      )
            )
            if numberOfGrantsUploaded(user_id, self.get_secure_cookie('madgikmining_grantsuploaded')) != 0:
                  cursor.execute("insert into grants select stripchars(c1) as c1, stripchars(c2) as c2 from (file '/tmp/p{0}.tsv')".format(user_id))
            cursor.close()

            data = {}
            data['data'] = 1
            self.write(json.dumps(data))
            self.flush()
            self.finish()
        except Exception as ints:
            self.set_status(400)
            self.write("A server error occurred, please contact administrator!")
            self.finish()
            print ints
            return


class SaveProfileToDatabaseHandler(BaseHandler):
    passwordless=True
    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "http://localhost:4200")
        self.set_header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
        self.set_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.set_header('Access-Control-Allow-Credentials', 'true')
        self.set_header('Content-Type', 'application/json')
    def options(self):
        # no body
        self.set_status(204)
        self.finish()
    def post(self):
        try:
            # get user id from cookie. Must have
            user_id = self.get_secure_cookie('madgikmining')
            if user_id is None:
                self.set_status(400)
                self.write("Missing cookie containing user's id...")
                return
            # get data
            profile_id = json.loads(self.request.body)['id']
            profile_name = json.loads(self.request.body)['name']
            doc_name = json.loads(self.request.body)['docname']
            docs_number = json.loads(self.request.body)['docsnumber']
            # copy profile file to a unique user profile file
            profile_file_name = "/tmp/OAMiningProfile_{0}.oamp".format(user_id)
            # check if profile has already an id
            old_profile = True
            if profile_id == '':
                # get unique profile id
                profile_id = getNewProfileId()
                old_profile = False
            unique_profile_file_name = "/tmp/OAMiningProfile_{0}_{1}.oamp".format(user_id,profile_id)
            copyfile(profile_file_name, unique_profile_file_name)
            # copy profile docs to unique profile docs
            if doc_name != '' and docs_number != 0:
                docs_file_name = "/tmp/docs{0}.json".format(user_id)
                unique_docs_file_name = "/tmp/OAMiningDocs_{0}_{1}.json".format(user_id,profile_id)
                copyfile(docs_file_name, unique_docs_file_name)
            # write new profile to database
            import sys
            sys.path.append(msettings.MADIS_PATH)
            import madis
            # database file name
            database_file_name = "/tmp/OAMiningProfilesDatabase_{0}.db".format(user_id)
            # get the database cursor
            cursor=madis.functions.Connection(database_file_name).cursor()
            user_profiles = []
            if old_profile:
                query = 'UPDATE database set name="{1}", datecreated="{2}", status="{3}", matches="{4}", docname="{5}", docsnumber="{6}" where id="{0}"'.format(profile_id,profile_name,"24-03-2018","Ready","8/8",doc_name,docs_number)
            else:
                query = 'INSERT INTO database VALUES("{0}","{1}","{2}","{3}","{4}","{5}","{6}")'.format(profile_id,profile_name,datetime.date.today().strftime("%B %d %Y"),"Saved","8/8",doc_name,docs_number)
            cursor.execute(query, parse=False)
            cursor.close()
            self.write(json.dumps({}))
            self.finish()
        except Exception as ints:
            self.set_status(400)
            self.write("A server error occurred, please contact administrator!")
            self.finish()
            print ints
            return


class DownloadProfileHandler(BaseHandler):
    passwordless=True
    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "http://localhost:4200")
        self.set_header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
        self.set_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.set_header('Access-Control-Allow-Credentials', 'true')
        self.set_header('Content-Type', 'application/oamp')
    def options(self):
        # no body
        self.set_status(204)
        self.finish()
    def post(self):
        try:
            # get user id from cookie. Must have
            user_id = self.get_secure_cookie('madgikmining')
            if user_id is None:
                self.set_status(400)
                self.write("Missing cookie containing user's id...")
                return
            profile_id = json.loads(self.request.body)['id']
            unique_profile_file_name = "/tmp/OAMiningProfile_{0}_{1}.oamp".format(user_id,profile_id)
            buf_size = 4096
            self.set_header('Content-Type', 'application/octet-stream')
            self.set_header('Content-Disposition', 'attachment; filename=' + "OAMiningProfile_{0}_{1}.oamp".format(user_id,profile_id))
            self.flush()
            with open(unique_profile_file_name, 'r') as f:
                while True:
                    data = f.read(buf_size)
                    if not data:
                        break
                    self.write(data)
            self.finish()
        except Exception as ints:
            self.set_status(400)
            self.write("A server error occurred, please contact administrator!")
            self.finish()
            print ints
            return


class madAppHandler(BaseHandler):
    def get(self):
        try:
            appname=re.match(r'.+/([^/]+)/?$', self.request.uri).groups()[0].lower()
        except AttributeError:
            raise tornado.web.HTTPError(404)

        appobj=None
        for ap in madapps.apps:
            if ap['link']==appname:
                appobj=ap
                break

        if appobj==None:
            raise tornado.web.HTTPError(404)

        self.render('madappview.html', app=appobj, apps=filteredapps, evals=filteredevals, settings=msettings)

class madAppDataHandler(BaseHandler):

    @tornado.web.asynchronous
    def post(self):
        try:
            appname, queryname=[x.lower() for x in re.match(r'.+/([^/]+)/(.+)$', self.request.uri).groups()]
        except AttributeError:
            raise tornado.web.HTTPError(404)

        appobj=None
        query=''
        for ap in madapps.apps:
            if ap['link']==appname:
                if queryname in ap:
                    appobj=ap
                    if queryname=='query':
                        query=appobj['query']
                    else:
                        query=appobj[queryname]['query']
                break

        if appobj==None:
            raise tornado.web.HTTPError(404)

        params=dict(((x.replace(' ','_'),y[0].replace('\n','')) for x,y in self.request.arguments.iteritems()) )
        self.executequery(query, params)




def main():
    global filteredapps, filteredevals

    def getqtext(query,params):
        query=query.strip('\n \s')
        query=escape.xhtml_escape(query)
        for i in params:
            i=i.replace(' ','_')
            query=re.sub(':'+i, '<b><i>'+escape.xhtml_escape(i)+'</i></b>', query)
            query=re.sub('$'+i, '<b><i>'+escape.xhtml_escape(i)+'</i></b>', query)
            query=re.sub('@'+i, '<b><i>'+escape.xhtml_escape(i)+'</i></b>', query)
        return query.replace("\n","<br/>")

    if 'initial_queries' in queries:
        try:
            list(msettings.Connection.cursor().execute(queries['initial_queries']))
        except Exception, e:
            raise Exception("Error when executing DB_INITIAL_EXECUTE:\n"+queries['initial_queries']+"\nThe error was:\n"+ str(e))
    
    tornado.options.parse_command_line()
    
    logging.info('Completed madApp startup scripts')

    filteredapps=filter(lambda x:("eval" not in x),madapps.apps)
    filteredevals=filter(lambda x:("eval" in x),madapps.apps)

    if not msettings.DEBUG:
        sockets = tornado.netutil.bind_sockets(options.port)
        tornado.process.fork_processes(0) 
        server = tornado.httpserver.HTTPServer(Application())
        #        ssl_options = {
        #"certfile": os.path.join("/home/openaire/ssl/certificate.crt"),
        #"keyfile": os.path.join("/home/openaire/ssl/privateKey.key"),
#})
        server.add_sockets(sockets)
        tornado.ioloop.IOLoop.instance().start()
    else:
#       debug case 
        http_server = tornado.httpserver.HTTPServer(Application())
        http_server.bind(options.port)
        http_server.start(1)
        tornado.ioloop.IOLoop.instance().start()



if __name__ == "__main__":
    main()
