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

class Application(tornado.web.Application):
    def __init__(self):
        handlers = [
            (r"/version", VersionHandler),
            (r"/initialhandshake", InitialClientHandshakeHandler),
            (r"/getusersprofiles", GetUsersProfilesHandler),
            (r"/updateprofilestatus", UpdateProfileStatusHandler),
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
            (r"/downloadprofile", DownloadProfileHandler)
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
        file_name = "users_files/p%s.tsv" % (user_id)
        if os.path.isfile(file_name):
            num_lines = sum(1 for line in open(file_name))
            if str(num_lines) == cookie_set: 
                return num_lines
    return 0

def numberOfDocsUploaded(user_id):
    if user_id:
        file_name = "users_files/docs%s.json" % (user_id)
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
        cursor.execute("output 'users_files/p{0}.tsv' select c1,c2 from grants".format(user_id))
        # Get the number of grants uploaded
        file_name = "users_files/p%s.tsv" % (user_id)
        if os.path.isfile(file_name):
            numberOfGrants = sum(1 for line in open(file_name))
        data['concepts'] = numberOfGrants
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
        file_name = "users_files/p%s.tsv" % (user_id)
        if os.path.isfile(file_name):
            os.remove(file_name)
        file_name = "users_files/docs%s.json" % (user_id)
        if os.path.isfile(file_name):
            os.remove(file_name)

def loadProfileDocs(user_id, profile_id):
    # copy unique profile docs file to a general user docs file
    docs_file_name = "users_files/docs{0}.json".format(user_id)
    unique_profile_docs_file_name = "users_files/OAMiningDocs_{0}_{1}.json".format(user_id,profile_id)
    if os.path.isfile(unique_profile_docs_file_name):
        copyfile(unique_profile_docs_file_name, docs_file_name)

def loadExampleDocs(docsLocation, user_id):
    sample_file = open(docsLocation, 'r')
    # write data to physical file
    cname = "users_files/docs{0}.json".format(user_id)
    fh = open(cname, 'w')
    while 1:
        copy_buffer = sample_file.read(1048576)
        if not copy_buffer:
            break
        fh.write(copy_buffer)
    fh.close()
    return sum(1 for line in open(cname))

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


class VersionHandler(BaseHandler):
    passwordless=True
    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "*")
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
            self.write({'version': 0.5})
            self.finish()
        except Exception as ints:
            self.set_status(400)
            self.write("A server error occurred, please contact administrator!")
            self.finish()
            print ints
            return


class InitialClientHandshakeHandler(BaseHandler):
    passwordless=True
    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "*")
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
            if 'user' in self.request.arguments and self.request.arguments['user'][0] != '':
                user_id = self.request.arguments['user'][0]
                database_file_name = "users_files/OAMiningProfilesDatabase_{0}.db".format(user_id)
                if 'communityId' not in self.request.arguments or self.request.arguments['communityId'][0] == '':
                    self.set_status(400)
                    self.write("Missing arguement community id.")
                    return
                community_id = self.request.arguments['communityId'][0][:128]
                import sys
                sys.path.append(msettings.MADIS_PATH)
                import madis
                if (not os.path.isfile(database_file_name)):
                    if not os.path.exists("users_files"):
                        os.makedirs("users_files")
                    # create a database where the user stores his profiles info
                    # get the database cursor
                    cursor=madis.functions.Connection(database_file_name).cursor()
                    # Create database table
                    cursor.execute('''DROP TABLE IF EXISTS community''', parse=False)
                    cursor.execute('''CREATE TABLE community(id)''', parse=False)
                    cursor.execute('''INSERT INTO community VALUES(?)''', (community_id,), parse=False)
                    cursor.execute('''DROP TABLE IF EXISTS database''', parse=False)
                    cursor.execute('''CREATE TABLE database(id,name,datecreated,status,matches,docname,docsnumber)''', parse=False)
                    cursor.close()
                else:
                    cursor=madis.functions.Connection(database_file_name).cursor()
                    cursor.execute('''DROP TABLE IF EXISTS community''', parse=False)
                    cursor.execute('''CREATE TABLE community(id)''', parse=False)
                    cursor.execute('''INSERT INTO community VALUES(?)''', (community_id,), parse=False)
                    cursor.close()
            else:
                self.set_status(400)
                self.write("Missing cookie containing user's id...")
                return
            self.write({})
            self.finish()
        except Exception as ints:
            self.set_status(400)
            self.write("A server error occurred, please contact administrator!")
            self.finish()
            print ints
            return


class GetUsersProfilesHandler(BaseHandler):
    passwordless=True
    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "*")
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
            # Check if the user has the admin parameter
            if 'isinadministrators' not in self.request.arguments or self.request.arguments['isinadministrators'][0] != 'true':
                self.set_status(400)
                self.write("Must be an admin")
                return
            # list users
            users = [re.search('OAMiningProfilesDatabase_([\\w0-9]+).+', f).group(1) for f in os.listdir('./users_files') if re.match(r'OAMiningProfilesDatabase_[\w0-9]+\.db', f)]
            print users
            # for every user, read its database to find his profiles
            import sys
            sys.path.append(msettings.MADIS_PATH)
            import madis
            # data to be sent
            data = {}
            users_profiles = []
            for user in users:
                database_file_name = "users_files/OAMiningProfilesDatabase_{0}.db".format(user)
                if not os.path.isfile(database_file_name):
                    self.set_status(400)
                    self.write("Missing user\'s database")
                    return
                # get the database cursor
                cursor=madis.functions.Connection(database_file_name).cursor()
                try:
                    # get community id
                    community_id = [r for r in cursor.execute('''SELECT id FROM community''')][0]
                except Exception as ints:
                    print ints
                    community_id = 'Unkown '+user
                for r in cursor.execute('''SELECT id,name,datecreated,status,matches,docname FROM database order by rowid desc'''):
                    users_profiles.append({"user":community_id,"userId":user,"profileId":r[0], "profile": r[1], "datecreated": r[2], "status": r[3], "matches": r[4], "docname": r[5]})
            data['profiles'] = users_profiles
            self.write(json.dumps(data))
            self.finish()
        except Exception as ints:
            self.set_status(400)
            self.write("A server error occurred, please contact administrator!")
            self.finish()
            print ints
            return


class UpdateProfileStatusHandler(BaseHandler):
    passwordless=True
    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "*")
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
            # get user id from body. Must have
            request_arguments = json.loads(self.request.body)
            if 'isinadministrators' not in request_arguments or request_arguments['isinadministrators'] != 'true':
                self.set_status(400)
                self.write("Must be an admin")
                return
            import sys
            sys.path.append(msettings.MADIS_PATH)
            import madis
            user = request_arguments['user'][:128]
            profile_id = request_arguments['id'][:128]
            database_file_name = "users_files/OAMiningProfilesDatabase_{0}.db".format(user)
            if not os.path.isfile(database_file_name):
                self.set_status(400)
                self.write("Missing user\'s database")
                return
            cursor=madis.functions.Connection(database_file_name).cursor()
            # Write new Profile status to users database
            status = request_arguments['status']
            cursor.execute('''UPDATE database set status=? where id=?''', (profile_id,status,), parse=False)
            cursor.close()
            self.write(json.dumps({}))
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
        self.set_header("Access-Control-Allow-Origin", "*")
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
            # get user id from arguments. Must have
            if 'user' not in self.request.arguments or self.request.arguments['user'][0] == '':
                self.set_status(400)
                self.write("Missing user's id parameter")
                return
            user_id = self.request.arguments['user'][0][:128]
            # extract data from database
            import sys
            sys.path.append(msettings.MADIS_PATH)
            import madis
            # database file name
            database_file_name = "users_files/OAMiningProfilesDatabase_{0}.db".format(user_id)
            if not os.path.isfile(database_file_name):
                self.set_status(400)
                self.write("Missing user\'s database")
                return
            # get the database cursor
            cursor=madis.functions.Connection(database_file_name).cursor()
            # data to be sent
            data = {}
            user_profiles = []
            for r in cursor.execute('''SELECT id,name,datecreated,status,matches,docname FROM database order by rowid desc'''):
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
        self.set_header("Access-Control-Allow-Origin", "*")
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
            # get user id from body. Must have
            request_arguments = json.loads(self.request.body)
            if 'user' not in request_arguments or request_arguments['user'] == '':
                self.set_status(400)
                self.write("Missing user's id argument")
                return
            user_id = request_arguments['user'][:128]
            # get data
            if 'id' not in request_arguments or request_arguments['id'] == '':
                self.set_status(400)
                self.write("Missing profiles id argument")
                return
            profile_id = request_arguments['id'][:128]
            # delete profile from database
            import sys
            sys.path.append(msettings.MADIS_PATH)
            import madis
            # database file name
            database_file_name = "users_files/OAMiningProfilesDatabase_{0}.db".format(user_id)
            # get the database cursor
            cursor=madis.functions.Connection(database_file_name).cursor()
            # check if this profile exists
            profile_data = [r for r in cursor.execute('''SELECT docname,docsnumber FROM database WHERE id=?''', (profile_id,))]
            if len(profile_data) == 0:
                self.set_status(400)
                self.write("There is no profile with this name")
                cursor.close()
                return
            cursor.close()
            # check if profile file exists on the disk
            file_name = "users_files/OAMiningProfile_%s_%s.oamp" % (user_id,profile_id)
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
        self.set_header("Access-Control-Allow-Origin", "*")
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
            # get user id from body. Must have
            request_arguments = json.loads(self.request.body)
            if 'user' not in request_arguments or request_arguments['user'] == '':
                self.set_status(400)
                self.write("Missing user's id argument")
                return
            user_id = request_arguments['user'][:128]
            # get data
            if 'id' not in request_arguments or request_arguments['id'] == '':
                self.set_status(400)
                self.write("Missing profiles id argument")
                return
            profile_id = request_arguments['id'][:128]
            # delete profile from database
            import sys
            sys.path.append(msettings.MADIS_PATH)
            import madis
            # database file name
            database_file_name = "users_files/OAMiningProfilesDatabase_{0}.db".format(user_id)
            # get the database cursor
            cursor=madis.functions.Connection(database_file_name).cursor()
            # data to be sent
            cursor.execute('''DELETE FROM database WHERE id=?''',(profile_id,), parse=False)
            cursor.close()
            # delete profile from disk
            file_name = "users_files/OAMiningProfile_%s_%s.oamp" % (user_id,profile_id)
            if os.path.isfile(file_name):
                os.remove(file_name)
            # delete profile docs from disk
            file_name = "users_files/OAMiningDocs_{0}_{1}.json".format(user_id,profile_id)
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
        self.set_header("Access-Control-Allow-Origin", "*")
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
            example_profiles.append({'name': 'Clarin', 'contents': 4, 'documents': 9})
            example_profiles.append({'name': 'Communities', 'contents': 25, 'documents': 104})
            example_profiles.append({'name': 'AOF', 'contents': 66, 'documents': 1023})
            example_profiles.append({'name': 'RCUK', 'contents': 263, 'documents': 140})
            example_profiles.append({'name': 'TARA', 'contents': 4, 'documents': 502})
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
        self.set_header("Access-Control-Allow-Origin", "*")
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
            # get user id from arguments. Must have
            if 'user' not in self.request.arguments or self.request.arguments['user'][0] == '':
                self.set_status(400)
                self.write("Missing user's id parameter")
                return
            user_id = self.request.arguments['user'][0][:128]
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
        self.set_header("Access-Control-Allow-Origin", "*")
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
            # get user id from body. Must have
            request_arguments = json.loads(self.request.body)
            if 'user' not in request_arguments or request_arguments['user'] == '':
                self.set_status(400)
                self.write("Missing user's id parameter")
                return
            user_id = request_arguments['user'][:128]
            # get data
            if 'name' not in request_arguments or request_arguments['name'] == '':
                self.set_status(400)
                self.write("Missing example profiles name parameter")
                return
            example_name = request_arguments['name'][:128]
            # reset everything
            deleteAllUserFiles(user_id)
            data = {}
            if example_name == 'Clarin':
                data = loadProfile("static/example{0}Profile.oamp".format(example_name), user_id)
                data['docname'] = example_name
                data['docsnumber'] = loadExampleDocs("static/example{0}Docs.json".format(example_name), user_id)
            else:
                # load example data
                data = loadExampleProfile(user_id)
                data['docname'] = 'Example'
                data['docsnumber'] = loadExampleDocs("static/exampleDocs.txt", user_id)
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
        self.set_header("Access-Control-Allow-Origin", "*")
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
            # get user id from arguments. Must have
            if 'user' not in self.request.arguments or self.request.arguments['user'][0] == '':
                self.set_status(400)
                self.write("Missing user's id parameter")
                return
            user_id = self.request.arguments['user'][0][:128]
            # get file info and body from post data
            fileinfo = self.request.files['upload'][0][:128]
            fname = fileinfo['filename']
            extn = os.path.splitext(fname)[1]
            # must be .pdf or .json
            if extn != ".oamp":
                self.write(json.dumps({'respond': "<b style=\"color: red\">File must be .oamp compatible profile</b>"}))
                return
            # write data to physical file
            cname = "users_files/profile{0}.oamp".format(user_id)
            fh = open(cname, 'w')
            fh.write(fileinfo['body'])
            fh.close()
            data = loadProfile(cname, user_id)
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
        self.set_header("Access-Control-Allow-Origin", "*")
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
            # get user id from arguments. Must have
            if 'user' not in self.request.arguments or self.request.arguments['user'][0] == '':
                self.set_status(400)
                self.write("Missing user's id parameter")
                return
            user_id = self.request.arguments['user'][0][:128]
            data = {}
            data['data'] = {}
            file_name = "users_files/p%s.tsv" % (user_id)
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
                # get user id from arguments. Must have
                if 'concepts' in self.request.arguments and self.request.arguments['concepts'][0] == str(num_lines):
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
        self.set_header("Access-Control-Allow-Origin", "*")
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
            # get user id from arguments. Must have
            if 'user' not in self.request.arguments or self.request.arguments['user'][0] == '':
                self.set_status(400)
                self.write("Missing user's id parameter")
                return
            user_id = self.request.arguments['user'][0][:128]
            # get file info and body from post data
            fileinfo = self.request.files['upload'][0][:128]
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
                data['concepts'] = str(len(lines))
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
        self.set_header("Access-Control-Allow-Origin", "*")
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
            # get user id from body. Must have
            request_arguments = json.loads(self.request.body)
            if 'user' not in request_arguments or request_arguments['user'] == '':
                self.set_status(400)
                self.write("Missing user's id argument")
                return
            user_id = request_arguments['user'][:128]
            # get data
            concepts = json.loads(json.loads(self.request.body)['concepts'])
            # write data to physical file
            cname = "users_files/p{0}.tsv".format(user_id)
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
                data['concepts'] = str(concepts_len)
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
        self.set_header("Access-Control-Allow-Origin", "*")
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
            # get user id from arguments. Must have
            if 'user' not in self.request.arguments or self.request.arguments['user'][0] == '':
                self.set_status(400)
                self.write("Missing user's id parameter")
                return
            user_id = self.request.arguments['user'][0][:128]
            data = {}
            doc_samples = []
            doc_samples.append({'name': 'Egi', 'documents': 104})
            doc_samples.append({'name': 'Clarin', 'documents': 7})
            doc_samples.append({'name': 'Wellcome Trust', 'documents': 250})
            doc_samples.append({'name': 'ARIADNE', 'documents': 502})
            doc_samples.append({'name': 'RCUK', 'documents': 104})
            doc_samples.append({'name': 'TARA', 'documents': 1023})
            doc_samples.append({'name': 'NIH', 'documents': 140})
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
        self.set_header("Access-Control-Allow-Origin", "*")
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
            # get user id from arguments. Must have
            if 'user' not in self.request.arguments or self.request.arguments['user'][0] == '':
                self.set_status(400)
                self.write("Missing user's id parameter")
                return
            user_id = self.request.arguments['user'][0][:128]
            fileinfo = self.request.files['upload'][0][:128]
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
            cname = "users_files/docs{0}{1}".format(user_id, extn)
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
                cname = "users_files/docs{0}.txt".format(user_id)
                with open(cname, 'r') as fin:
                    docData=fin.read().replace('\n', ' ')
                    if len(docData)==0:
                        self.set_status(400)
                        self.write("An error occurred when trying to convert .pdf to text...")
                        return
                with open("users_files/docs{0}.json".format(user_id), "wb") as fout:
                    json.dump({"text":docData,"id":os.path.splitext(fname)[0]}, fout)
                os.remove(cname)
            # else check if txt is in correct json format
            elif extn == ".txt" or extn == ".json":
                try:
                    jsonlist = []
                    for line in open(cname, 'r'):
                        jsonlist.append(json.loads(line))
                    os.rename(cname, "users_files/docs{0}.json".format(user_id))
                except ValueError, e:
                    self.set_status(400)
                    self.write("File is not in a valid json format...")
                    os.remove(cname)
                    print e
                    return
            file_name = "users_files/docs%s.json" % (user_id)
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
        self.set_header("Access-Control-Allow-Origin", "*")
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
            # get user id from body. Must have
            request_arguments = json.loads(self.request.body)
            if 'user' not in request_arguments or request_arguments['user'] == '':
                self.set_status(400)
                self.write("Missing user's id argument")
                return
            user_id = request_arguments['user'][:128]
            if 'docsample' not in request_arguments or request_arguments['docsample'] == '':
                self.set_status(400)
                self.write("A doc sample name must be provided")
                return
            doc_sample = request_arguments['docsample'][:128]
            sample_file_name = ""
            if doc_sample == "Egi":
                sample_file_name = "static/egi_sample.tsv"
            elif doc_sample == "Clarin":
                sample_file_name = "static/exampleClarinDocs.json"
            elif doc_sample == "Wellcome Trust":
                sample_file_name = "static/exampleWTDocs.json"
            else:
                self.set_status(400)
                self.write("No Doc sample with this name")
                return
            sample_file = open(sample_file_name, 'r')
            # write data to physical file
            cname = "users_files/docs{0}.json".format(user_id)
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
        self.set_header("Access-Control-Allow-Origin", "*")
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
            # get user id from arguments. Must have
            if 'user' not in self.request.arguments or self.request.arguments['user'][0] == '':
                self.set_status(400)
                self.write("Missing user's id parameter")
                return
            user_id = self.request.arguments['user'][0][:128]
            data = {}
            if msettings.RESET_FIELDS == 1:
                data['data'] = -1
            else:
                data['data'] = 0
            file_name = "users_files/docs%s.json" % (user_id)
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
        self.set_header("Access-Control-Allow-Origin", "*")
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
            # get user id from body. Must have
            request_arguments = json.loads(self.request.body)
            if 'user' not in request_arguments or request_arguments['user'] == '':
                self.set_status(400)
                self.write("Missing user's id argument")
                return
            user_id = request_arguments['user'][:128]
            mining_parameters = request_arguments['parameters']
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
            querygrantsize = '''SELECT max(p1) FROM (SELECT regexpcountwords('\s',stripchars(p1)) AS p1 FROM (setschema 'p1,p2' file 'users_files/p{0}.tsv' dialect:tsv))'''.format(user_id)
            contextmiddle = [r for r in cursor.execute(querygrantsize)][0][0]+1
            if 'contextprev' in mining_parameters and mining_parameters['contextprev'] != '':
                contextprev = int(mining_parameters['contextprev'])
                if contextprev < 0 or contextprev > 50:
                    self.set_status(400)
                    self.write("Context size must be in its limits...")
                    return
            if 'contextnext' in mining_parameters and mining_parameters['contextnext'] != '':
                contextnext = int(mining_parameters['contextnext'])
                if contextnext < 0 or contextnext > 50:
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

            # create positive and negative words weighted regex text
            pos_set = neg_set = conf = whr_conf = ''
            if 'poswords' in mining_parameters and mining_parameters['poswords'] != '{}':
                data['poswords'] = []
                # construct math string for positive words matching calculation with weights
                pos_words = json.loads(mining_parameters['poswords'])
                for key, value in pos_words.iteritems():
                    # MONO GIA TO EGI
                    if 'lowercase' in mining_parameters and mining_parameters['lowercase'] == 1:
                        key = key.decode('utf-8').lower()
                    if 'stemming' in mining_parameters and mining_parameters['stemming'] == 1:
                        key = 'stem('+key+')'
                    pos_set += r'regexpcountuniquematches("%s",%s)*%s + ' % (key,j2scontext,value)
                    # ORIGINAL
                    # pos_set += r'regexpcountuniquematches("(?:\b)%s(?:\b)",j2s(prev,middle,next))*%s + ' % (key,value)
                    data['poswords'].append(key)
                pos_set += "0"
            if 'negwords' in mining_parameters and mining_parameters['negwords'] != '{}':
                data['negwords'] = []
                # construct math string for negative words matching calculation with weights
                neg_words = json.loads(mining_parameters['negwords'])
                for key, value in neg_words.iteritems():
                    # MONO GIA TO EGI
                    if 'lowercase' in mining_parameters and mining_parameters['lowercase'] == 1:
                        key = key.decode('utf-8').lower()
                    if 'stemming' in mining_parameters and mining_parameters['stemming'] == 1:
                        key = 'stem('+key+')'
                    neg_set += r'regexpcountuniquematches("%s",%s)*%s + ' % (key,j2scontext,value)
                    # ORIGINAL
                    # neg_set += r'regexpcountuniquematches("(?:\b)%s(?:\b)",j2s(prev,middle,next))*%s - ' % (key,value)
                    data['negwords'].append(key)
                neg_set += "0"
            if pos_set != '' and neg_set != '':
                conf = ", ({0} - ({1}))".format(pos_set, neg_set)
            elif pos_set != '':
                conf = ", {0}".format(pos_set)
            elif neg_set != '':
                conf = ", -({0})".format(neg_set)
            if conf != '':
                conf += ' as conf'
                whr_conf = 'and conf>=0'
            print conf

            # docs proccess
            if numberOfDocsUploaded(user_id) != 0:
                document_source = 'd2'
                if 'documentarea' in mining_parameters and mining_parameters['documentarea'] != '':
                    print mining_parameters['documentarea']
                    if mining_parameters['documentarea'] == 'acknowledgment':
                        document_source = 'textacknowledgments('+document_source+')'
                    elif mining_parameters['documentarea'] == 'citations':
                        document_source = 'textreferences('+document_source+')'
                doc_filters = "comprspaces(regexpr('[\n|\r]',"+document_source+",' '))"
                grant_filters = "stripchars(comprspaces(regexpr(\"\\'\", p1,'')))"
                ackn_filters = "comprspaces(regexpr(\"\\'\", p2,''))"
                if 'punctuation' in mining_parameters and mining_parameters['punctuation'] == 1:
                    doc_filters = 'keywords('+doc_filters+')'
                    grant_filters = 'keywords('+grant_filters+')'
                    ackn_filters = 'keywords('+ackn_filters+')'
                if 'lowercase' in mining_parameters and mining_parameters['lowercase'] == 1:
                    doc_filters = 'lower('+doc_filters+')'
                    grant_filters = 'lower('+grant_filters+')'
                    ackn_filters = 'lower('+ackn_filters+')'
                if 'stopwords' in mining_parameters and mining_parameters['stopwords'] == 1:
                    doc_filters = 'filterstopwords('+doc_filters+')'
                    grant_filters = 'filterstopwords('+grant_filters+')'
                    ackn_filters = 'filterstopwords('+ackn_filters+')'
                if 'stemming' in mining_parameters and mining_parameters['stemming'] == 1:
                    doc_filters = 'stem('+doc_filters+')'
                    grant_filters = 'stem('+grant_filters+')'
                    ackn_filters = 'stem('+ackn_filters+')'
                list(cursor.execute("drop table if exists grantstemp"+user_id, parse=False))
                query_pre_grants = "create temp table grantstemp{0} as select {1} as gt1, case when p2 is null then null else {2} end as gt2 from (setschema 'p1,p2' file 'users_files/p{0}.tsv' dialect:tsv)".format(user_id, grant_filters, ackn_filters)
                cursor.execute(query_pre_grants)
                # query00get = "select * from grantstemp{0}".format(user_id)
                # results00get = [r for r in cursor.execute(query00get)]
                # print results00get
                list(cursor.execute("drop table if exists docs"+user_id, parse=False))
                query1 = "create temp table docs{0} as select d1, {1} as d2 from (setschema 'd1,d2' select jsonpath(c1, '$.id', '$.text') from (file 'users_files/docs{0}.json'))".format(user_id, doc_filters)
                cursor.execute(query1)
            else:
                self.set_status(400)
                self.write("You have to provide atleast 1 document...")
                return

            # grants proccess
            list(cursor.execute("drop table if exists grants"+user_id, parse=False))
            # string concatenation workaround because of the special characters conflicts
            if 'wordssplitnum' in mining_parameters and mining_parameters['wordssplitnum'] != '':
                words_split = int(mining_parameters['wordssplitnum'])
                gt2 = 'comprspaces(gt2)'
                if 'lowercase' in mining_parameters and mining_parameters['lowercase'] == 1:
                    gt2 = 'lower('+gt2+')'
                if 'stemming' in mining_parameters and mining_parameters['stemming'] == 1:
                    gt2 = 'stem('+gt2+')'
                # MONO GIA TO EGI
                if 0 < words_split and words_split <= 20:
                    acknowledgment_split = r'textwindow2s('+gt2+',0,'+str(words_split)+r',0)'
                else:
                    acknowledgment_split = r'"dummy" as prev, '+gt2+' as middle, "dummy" as next'
                # ORIGINAL
                # if 0 < words_split and words_split <= 20:
                #     acknowledgment_split = r'textwindow2s(regexpr("([\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|])", gt2, "\\\1"),0,'+str(words_split)+r',0)'
                # else:
                #     acknowledgment_split = r'"dummy" as prev, regexpr("([\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|])", gt2, "\\\1") as middle, "dummy" as next'

                # query0 = r"create temp table grants"+user_id+r' as select gt1 as g1, jmergeregexp(jgroup("(?<=[\s\b])"||middle||"(?=[\s\b])")) as g2 from '+r"(setschema 'gt1,prev,middle,next' select gt1, "+acknowledgment_split+r' from grantstemp'+user_id+r' where (gt1 or gt1!="") and gt2 not null) group by gt1 union all select distinct gt1 as g1, "(?!.*)" as g2 from grantstemp'+user_id+r" where (gt1 or gt1!='') and gt2 is null"
                query0 = r"create temp table grants"+user_id+r' as select gt1 as g1, jmergeregexp(jgroup(middle)) as g2 from '+r"(setschema 'gt1,prev,middle,next' select gt1, "+acknowledgment_split+r' from grantstemp'+user_id+r' where (gt1 or gt1!="") and gt2 != "") group by gt1 union all select distinct gt1 as g1, "(.+)" as g2 from grantstemp'+user_id+r" where (gt1 or gt1!='') and gt2 = '' union all select distinct gt1 as g1, jmergeregexp(gt2) as g2 from grantstemp"+user_id+r" where (gt1 or gt1!='') and (gt2 or gt2!='') and regexpcountwords(' ', "+gt2+r")<"+str(words_split)+r""
                cursor.execute(query0)
                query0get = "select * from grants{0}".format(user_id)
                results0get = [r for r in cursor.execute(query0get)]
                print results0get

            # FOR EGI ONLY
            query2 = r'select distinct d1, r1, extraprev, prev, middle, next, extranext, case when g2="(.+)" then "[ ]" else acknmatch end as acknmatch, max(confidence) as confidence from (select d1, regexpr("(?:\b|\d|\W)("||T.g1||")(?:\b|\d|\W)",middle) as r1, g1, g2, regexpcountuniquematches(g2, '+j2scontext+r') as confidence, stripchars('+j2sextraprev+r') as extraprev, stripchars('+j2sprev+r') as prev, middle, stripchars('+j2snext+r') as next, stripchars('+j2sextranext+r') as extranext, '+j2scontext+r' as context, regexprfindall(g2, '+j2scontext+r') as acknmatch '+conf+r' from (select d1, textwindow(d2,'+str(extracontextprev+contextprev)+r','+str(extracontextnext+contextnext)+r','+str(contextmiddle)+r') from docs'+user_id+r'), (select g1, g2 from grants'+user_id+r') T where r1 not null and acknmatch!="[]" '+whr_conf+r') group by d1'
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
        self.set_header("Access-Control-Allow-Origin", "*")
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
            # get user id from body. Must have
            request_arguments = json.loads(self.request.body)
            if 'user' not in request_arguments or request_arguments['user'] == '':
                self.set_status(400)
                self.write("Missing user's id argument")
                return
            user_id = request_arguments['user'][:128]
            profile_parameters = request_arguments['parameters']
            import sys
            sys.path.append(msettings.MADIS_PATH)
            import madis
            # get the database cursor
            # profile file name
            profile_file_name = "users_files/OAMiningProfile_{0}.oamp".format(user_id)
            cursor=madis.functions.Connection(profile_file_name).cursor()
            # Create poswords table
            cursor.execute('''DROP TABLE IF EXISTS poswords''', parse=False)
            cursor.execute('''CREATE TABLE poswords(c1,c2)''', parse=False)
            # Create negwords table
            cursor.execute('''DROP TABLE IF EXISTS negwords''', parse=False)
            cursor.execute('''CREATE TABLE negwords(c1,c2)''', parse=False)
            # Create filters table
            cursor.execute('''DROP TABLE IF EXISTS filters''', parse=False)
            cursor.execute('''CREATE TABLE filters(c1,c2)''', parse=False)
            # Create grants table
            cursor.execute('''DROP TABLE IF EXISTS grants''', parse=False)
            cursor.execute('''CREATE TABLE grants(c1,c2)''', parse=False)
            if 'poswords' in profile_parameters and profile_parameters['poswords'] != '{}':
                # construct math string for positive words matching calculation with weights
                pos_words = json.loads(profile_parameters['poswords'])
                cursor.executemany('''INSERT INTO poswords(c1,c2) VALUES(?,?)''',
                          (
                                (key, value,) for key, value in pos_words.iteritems()
                          )
                )
            if 'negwords' in profile_parameters and profile_parameters['negwords'] != '{}':
                # construct math string for negative words matching calculation with weights
                neg_words = json.loads(profile_parameters['negwords'])
                cursor.executemany('''INSERT INTO negwords(c1,c2) VALUES(?,?)''',
                          (
                                (key, value,) for key, value in neg_words.iteritems()
                          )
                )
            filters = {}
            if 'contextprev' in profile_parameters and profile_parameters['contextprev'] != '':
                filters['contextprev'] = profile_parameters['contextprev']
            if 'contextnext' in profile_parameters and profile_parameters['contextnext'] != '':
                filters['contextnext'] = profile_parameters['contextnext']
            if 'lowercase' in profile_parameters and profile_parameters['lowercase'] != '':
                filters['lowercase'] = profile_parameters['lowercase']
            if 'wordssplitnum' in profile_parameters and profile_parameters['wordssplitnum'] != '':
                filters['wordssplitnum'] = profile_parameters['wordssplitnum']
            if 'stopwords' in profile_parameters and profile_parameters['stopwords'] != '':
                filters['stopwords'] = profile_parameters['stopwords']
            if 'punctuation' in profile_parameters and profile_parameters['punctuation'] != '':
                filters['punctuation'] = profile_parameters['punctuation']
            if 'stemming' in profile_parameters and profile_parameters['stemming'] != '':
                filters['stemming'] = profile_parameters['stemming']
            if 'documentarea' in profile_parameters and profile_parameters['documentarea'] != '':
                filters['documentarea'] = profile_parameters['documentarea']
            cursor.executemany('''INSERT INTO filters(c1,c2) VALUES(?,?)''',
                      (
                            (key, value,) for key, value in filters.iteritems()
                      )
            )
            if numberOfGrantsUploaded(user_id, request_arguments['concepts']) != 0:
                # cursor.execute('''VAR 'currprofile' VALUES(?)''', ('users_files/p{0}.tsv'.format(user_id),))
                cursor.execute('''INSERT INTO grants SELECT stripchars(c1) as c1, stripchars(c2) as c2 FROM (file 'users_files/p{0}.tsv')'''.format(user_id))
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
        self.set_header("Access-Control-Allow-Origin", "*")
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
            # get user id from body. Must have
            request_arguments = json.loads(self.request.body)
            if 'user' not in request_arguments or request_arguments['user'] == '':
                self.set_status(400)
                self.write("Missing user's id argument")
                return
            user_id = request_arguments['user'][:128]
            # get data
            profile_id = request_arguments['id'][:128]
            profile_name = request_arguments['name'][:128]
            doc_name = request_arguments['docname'][:128]
            docs_number = request_arguments['docsnumber']
            # copy profile file to a unique user profile file
            profile_file_name = "users_files/OAMiningProfile_{0}.oamp".format(user_id)
            # check if profile has already an id
            old_profile = True
            if profile_id == '':
                # get unique profile id
                profile_id = getNewProfileId()
                old_profile = False
            unique_profile_file_name = "users_files/OAMiningProfile_{0}_{1}.oamp".format(user_id,profile_id)
            copyfile(profile_file_name, unique_profile_file_name)
            # copy profile docs to unique profile docs
            if doc_name != '' and docs_number != 0:
                docs_file_name = "users_files/docs{0}.json".format(user_id)
                unique_docs_file_name = "users_files/OAMiningDocs_{0}_{1}.json".format(user_id,profile_id)
                copyfile(docs_file_name, unique_docs_file_name)
            # write new profile to database
            import sys
            sys.path.append(msettings.MADIS_PATH)
            import madis
            # database file name
            database_file_name = "users_files/OAMiningProfilesDatabase_{0}.db".format(user_id)
            # get the database cursor
            cursor=madis.functions.Connection(database_file_name).cursor()
            user_profiles = []
            if old_profile:
                cursor.execute('''UPDATE database SET datecreated=?, status=?, matches=?, docname=?, docsnumber=? WHERE id=?''', (datetime.date.today().strftime("%B %d %Y"),"Ready","8/8",doc_name,docs_number,profile_id), parse=False)
            else:
                cursor.execute('''INSERT INTO database VALUES(?,?,?,?,?,?,?)''', (profile_id,profile_name,datetime.date.today().strftime("%B %d %Y"),"Saved","8/8",doc_name,docs_number,), parse=False)
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
        self.set_header("Access-Control-Allow-Origin", "*")
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
            # get user id from body. Must have
            request_arguments = json.loads(self.request.body)
            if 'user' not in request_arguments or request_arguments['user'] == '':
                self.set_status(400)
                self.write("Missing user's id argument")
                return
            user_id = request_arguments['user'][:128]
            profile_id = request_arguments['id'][:128]
            unique_profile_file_name = "users_files/OAMiningProfile_{0}_{1}.oamp".format(user_id,profile_id)
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


def main():
    def getqtext(query,params):
        query=query.strip('\n \s')
        query=escape.xhtml_escape(query)
        for i in params:
            i=i.replace(' ','_')
            query=re.sub(':'+i, '<b><i>'+escape.xhtml_escape(i)+'</i></b>', query)
            query=re.sub('$'+i, '<b><i>'+escape.xhtml_escape(i)+'</i></b>', query)
            query=re.sub('@'+i, '<b><i>'+escape.xhtml_escape(i)+'</i></b>', query)
        return query.replace("\n","<br/>")

    tornado.options.parse_command_line()

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
