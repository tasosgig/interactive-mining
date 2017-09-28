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
            (r"/", createUploadProfileHandler),
            (r"/upload-codes", uploadCodesHandler),
            (r"/save-config-controller", profileCreationHandler),
            (r"/download-config-controller", profileServeHandler),
            (r"/configure-profile", configureProfileHandler),
            (r"/save-profile", saveProfileHandler),
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

def deleteAllUserFiles(user_id):
    if user_id:
        file_name = "/tmp/p%s.tsv" % (user_id)
        if os.path.isfile(file_name):
            os.remove(file_name)
        file_name = "/tmp/docs%s.json" % (user_id)
        if os.path.isfile(file_name):
            os.remove(file_name)


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


class createUploadProfileHandler(BaseHandler):
    passwordless=True
    # When loading the page first time and every refresh
    def get(self):
        if 'data' in self.request.arguments:
            return
        else:
            # check if we already gave client a user_id
            user_id = self.get_secure_cookie('madgikmining')
            if not user_id:
                # give him a unique user_id
                user_id = 'user{0}'.format(datetime.datetime.now().microsecond + (random.randrange(1, 100+1) * 100000))
                self.set_secure_cookie('madgikmining', user_id)
            self.render('create_upload_profile.html', settings=msettings)
    # TODO Upload profile post
    def post(self):
        try:
            user_id = self.get_secure_cookie('madgikmining')
            if user_id is None:
                return
            if 'upload' in self.request.files:
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
                # extract data from profile file
                import sys
                sys.path.append(msettings.MADIS_PATH)
                import madis
                # get the profile database cursor
                cursor=madis.functions.Connection(cname).cursor()

                # data to be sent
                data = {}
                # Write to csv file the grants ids
                if len([r for r in cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='grants'")]):
                    cursor.execute("output '/tmp/p{0}.csv' select * from grants".format(user_id))
                    numberOfGrants = numberOfGrantsUploaded(user_id, "puppet_value")
                    self.set_secure_cookie('madgikmining_grantsuploaded', str(numberOfGrants))
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
                    data['filters'] = {value:key for value, key in results}
                cursor.close()
                self.write(json.dumps(data))
                self.finish()

        except Exception as ints:
            self.write(json.dumps({'respond': "<b style=\"color: red\">Something went very wrong!</b>"}))
            print ints
            return


class uploadCodesHandler(BaseHandler):
    passwordless=True
    # When loading the page first time and every refresh
    def get(self):
        if 'data' in self.request.arguments:
            return
        # check if we gave client a user_id
        user_id = self.get_secure_cookie('madgikmining')
        if user_id is None:
            return 
        if 'new' in self.request.arguments and self.request.arguments['new'][0] == '1':
            msettings.RESET_FIELDS = 1
            # reset everything
            deleteAllUserFiles(user_id)
        # check if he already uploaded his grants ids and inform him via a message
        self.render('upload_codes.html', settings=msettings)
    def post(self):
        try:
            # get user id from cookie. Must have
            user_id = self.get_secure_cookie('madgikmining')
            if user_id is None:
                return
            # service to upload a tsv file with the codes. Returns the codes
            if 'upload' in self.request.files:
                # get file info and body from post data
                fileinfo = self.request.files['upload'][0]
                fname = fileinfo['filename']
                extn = os.path.splitext(fname)[1]
                # must be .pdf or .json
                if extn != ".tsv" and extn != ".txt":
                    self.write(json.dumps({'respond': "<b style=\"color: red\">File must be .tsv or .txt</b>"}))
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
            # service to store the final user codes. Returns the number of the codes
            elif 'concepts' in self.request.arguments and self.request.arguments['concepts'][0] != '{}':
                # write data to physical file
                cname = "/tmp/p{0}.tsv".format(user_id)
                fh = open(cname, 'w')
                concepts = json.loads(self.request.arguments['concepts'][0])
                for key, value in concepts.iteritems():
                    if key == '':
                        continue
                    fh.write("{0}\t{1}\n".format(key,value))
                fh.close()
                # data to be sent
                data = {}
                if len(concepts) == 0:
                    data['error'] = "You have to provide at least one concept to continue"
                else:
                    data['respond'] = "<b>{0} Codes</b> loaded successfully!".format(len(concepts))
                    self.set_secure_cookie('madgikmining_grantsuploaded', str(len(concepts)))
                self.write(json.dumps(data))
                self.finish()
            # service to return the already uploaded user codes
            elif 'already' in self.request.arguments:
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
            data = {}
            data['error'] = "<b style=\"color: red\">File Failed to Upload!</b>"
            self.write(json.dumps(data))
            self.finish()
            print ints
            return


class configureProfileHandler(BaseHandler):
    passwordless=True
    # When loading the page first time and evry refresh
    def get(self):
        if 'data' in self.request.arguments:
            return
        else:
            # check if we already gave client a user_id
            user_id = self.get_secure_cookie('madgikmining')
            if user_id is None:
                return
            # check if he uploaded his codes
            if numberOfGrantsUploaded(user_id, self.get_secure_cookie('madgikmining_grantsuploaded')):
                self.render('configure_profile.html', settings=msettings)
            else:
                self.redirect('/upload-codes')
    def post(self):
        try:
            # get user id from cookie. Must have
            user_id = self.get_secure_cookie('madgikmining')
            if user_id is None:
                return
            # post case where the user uploads his own documents
            if 'upload' in self.request.files:
                # get file info and body from post data
                fileinfo = self.request.files['upload'][0]
                fname = fileinfo['filename']
                extn = os.path.splitext(fname)[1]
                # data to be sent
                data = {}
                # must be .pdf, .txt or .json
                if extn != ".pdf" and extn != ".txt" and extn != ".json":
                    data['error'] = "<b style=\"color: red\">File must be .pdf, .json or .txt</b>"
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
                        data['error'] = "<b style=\"color: red\">Cannot convert .pdf to .txt</b>"
                        return
                    os.remove(cname)
                    cname = "/tmp/docs{0}.txt".format(user_id)
                    with open(cname, 'r') as fin:
                        docData=fin.read().replace('\n', ' ')
                        if len(docData)==0:
                            data['error'] = "<b style=\"color: red\">Cannot convert .pdf to .txt</b>"
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
                        data['error'] = "<b style=\"color: red\">File is not in a valid json format</b>"
                        os.remove(cname)
                        print e
                        return
                file_name = "/tmp/docs%s.json" % (user_id)
                if os.path.isfile(file_name):
                    data['data'] = sum(1 for line in open(file_name))
                self.write(json.dumps(data))
                self.finish()
            # post case where the user selects form preset documents samples
            elif 'doc_sample' in self.request.arguments and self.request.arguments['doc_sample'][0] != '':

                sample_file_name = ""
                if self.request.arguments['doc_sample'][0] == "egi_sample":
                    sample_file_name = "static/egi_sample.tsv"
                elif self.request.arguments['doc_sample'][0] == "rcuk_sample":
                    sample_file_name = "static/rcuk_sample.tsv"
                elif self.request.arguments['doc_sample'][0] == "arxiv_sample":
                    sample_file_name = "static/arxiv_sample.tsv"
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
                    data['error'] = "You have to provide at least one concept to continue"
                else:
                    data['data'] = lines_num
                self.write(json.dumps(data))
                self.finish()
            # service to return the already uploaded documents
            elif 'already' in self.request.arguments:
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
            # post case for the actual mining proccess
            else:
                # data to be sent
                data = {}
                # create positive and negative words weighted regex text
                pos_set = neg_set = conf = whr_conf = ''
                if 'poswords' in self.request.arguments and self.request.arguments['poswords'][0] != '{}':
                    data['poswords'] = []
                    # construct math string for positive words matching calculation with weights
                    pos_words = json.loads(self.request.arguments['poswords'][0])
                    for key, value in pos_words.iteritems():
                        pos_set += r'regexpcountuniquematches("(?:\b)%s(?:\b)",j2s(prev,middle,next))*%s + ' % (key,value)
                        data['poswords'].append(key)
                    pos_set += "0"
                if 'negwords' in self.request.arguments and self.request.arguments['negwords'][0] != '{}':
                    data['negwords'] = []
                    # construct math string for negative words matching calculation with weights
                    neg_words = json.loads(self.request.arguments['negwords'][0])
                    for key, value in neg_words.iteritems():
                        neg_set += r'regexpcountuniquematches("(?:\b)%s(?:\b)",j2s(prev,middle,next))*%s - ' % (key,value)
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

                # get the database cursor
                cursor=msettings.Connection.cursor()

                if numberOfDocsUploaded(user_id) != 0:
                    doc_filters = "regexpr('[\n|\r]',d2,' ')"
                    ackn_filters = "regexpr(\"\\'\", p2,'')"
                    if 'punctuation' in self.request.arguments and self.request.arguments['punctuation'][0] == "1":
                        doc_filters = 'keywords('+doc_filters+')'
                        ackn_filters = 'keywords('+ackn_filters+')'
                    if 'lettercase' in self.request.arguments and self.request.arguments['lettercase'][0] != '' and self.request.arguments['lettercase'][0] != 'None':
                        if self.request.arguments['lettercase'][0] == 'Lowercase':
                            doc_filters = 'lower('+doc_filters+')'
                            ackn_filters = 'lower('+ackn_filters+')'
                        elif self.request.arguments['lettercase'][0] == 'Uppercase':
                            doc_filters = 'upper('+doc_filters+')'
                            ackn_filters = 'upper('+ackn_filters+')'
                    if 'stopwords' in self.request.arguments and self.request.arguments['stopwords'][0] == "1":
                        doc_filters = 'filterstopwords('+doc_filters+')'
                        ackn_filters = 'filterstopwords('+ackn_filters+')'
                    list(cursor.execute("drop table if exists grantstemp"+user_id, parse=False))
                    query_pre_grants = "create temp table grantstemp{0} as select stripchars(p1) as gt1, case when p2 is null then null else {1} end as gt2 from (setschema 'p1,p2' file '/tmp/p{0}.tsv' dialect:tsv)".format(user_id, ackn_filters)
                    cursor.execute(query_pre_grants)
                    list(cursor.execute("drop table if exists docs"+user_id, parse=False))
                    query1 = "create temp table docs{0} as select d1, {1} as d2 from (setschema 'd1,d2' select jsonpath(c1, '$.id', '$.text') from (file '/tmp/docs{0}.json'))".format(user_id, doc_filters)
                    cursor.execute(query1)
                else:
                    data['error'] = "You have to provide at least one concept to continue"
                    self.write(json.dumps(data))
                    self.finish()
                    return

                list(cursor.execute("drop table if exists grants"+user_id, parse=False))
                # string concatenation workaround because of the special characters conflicts
                if 'wordssplitnum' in self.request.arguments and self.request.arguments['wordssplitnum'][0] != '':
                    words_split = int(self.request.arguments['wordssplitnum'][0])
                    if 0 < words_split and words_split <= 10:
                        acknowledgment_split = r'textwindow2s(regexpr("([\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|])", gt2, "\\\1"),0,'+str(words_split)+r',0)'
                    else:
                        acknowledgment_split = r'"prev" as prev, regexpr("([\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|])", gt2, "\\\1") as middle, "next" as next'
                    # query0 = r"create temp table grants"+user_id+r' as select gt1 as g1, jmergeregexp(jgroup("(?<=[\s\b])"||middle||"(?=[\s\b])")) as g2 from '+r"(setschema 'gt1,prev,middle,next' select gt1, "+acknowledgment_split+r' from grantstemp'+user_id+r' where (gt1 or gt1!="") and gt2 not null) group by gt1 union all select distinct gt1 as g1, "(?!.*)" as g2 from grantstemp'+user_id+r" where (gt1 or gt1!='') and gt2 is null"
                    query0 = r"create temp table grants"+user_id+r' as select gt1 as g1, jmergeregexp(jgroup(middle)) as g2 from '+r"(setschema 'gt1,prev,middle,next' select gt1, "+acknowledgment_split+r' from grantstemp'+user_id+r' where (gt1 or gt1!="") and gt2 not null) group by gt1 union all select distinct gt1 as g1, "(?!.*)" as g2 from grantstemp'+user_id+r" where (gt1 or gt1!='') and gt2 is null"
                    cursor.execute(query0)
                    query0get = "select * from grants{0}".format(user_id)
                    results0get = [r for r in cursor.execute(query0get)]
                    print results0get

                query2 = "select d1, g1, context, acknmatch, max(confidence) as confidence from (select d1, g1, regexpcountuniquematches(g2, j2s(prev,middle,next)) as confidence, j2s(prev,middle,next) as context, regexprfindall(g2, j2s(prev,middle,next)) as acknmatch {0} from (select d1, textwindow2s(d2,20,1,20) from (select * from docs{1})), (select g1, g2 from grants{1}) T where middle = T.g1 {2}) group by d1".format(conf, user_id, whr_conf)
                # query2 = "select c1, c3 {0} from (select c1, textwindow2s(c2,10,1,5) from (select * from docs{1})), (select c3 from grants{1}) T where middle = T.c3 {2}".format(conf, user_id, whr_conf)
                results = [r for r in cursor.execute(query2)]
                print results
                doctitles = {}
                for r in results:
                    if r[0] not in doctitles:
                        doctitles[r[0]] = []
                    doctitles[r[0]].append({"match": r[1], "context": r[2], "acknmatch": json.loads(r[3]), "confidence": r[4]})
                data['matches'] = doctitles
                self.write(json.dumps(data))
                self.flush()
                self.finish()

        except Exception as ints:
            data = {}
            data['error'] = "<b style=\"color: red\">Something went very very wrong!</b>"
            self.write(json.dumps(data))
            self.finish()
            print ints

        try:
            cursor.close()
        except:
            pass


class saveProfileHandler(BaseHandler):
    passwordless=True
    # When loading the page first time and evry refresh
    def get(self):
        if 'data' in self.request.arguments:
            return
        elif 'saveprofile' in self.request.arguments and self.request.arguments['saveprofile'][0] == '1':
            user_id = self.get_secure_cookie('madgikmining')
            if user_id is None:
                return
            profile_file_name = "/tmp/OAMiningProfile_{0}.oamp".format(user_id)
            buf_size = 4096
            self.set_header('Content-Type', 'application/octet-stream')
            self.set_header('Content-Disposition', 'attachment; filename=' + "OAMiningProfile_{0}.oamp".format(user_id))
            self.flush()
            with open(profile_file_name, 'r') as f:
                while True:
                    data = f.read(buf_size)
                    if not data:
                        break
                    self.write(data)
            self.finish()
        else:
            # check if we already gave client a user_id
            user_id = self.get_secure_cookie('madgikmining')
            if user_id is None:
                return
            # check if he uploaded his codes
            if numberOfGrantsUploaded(user_id, self.get_secure_cookie('madgikmining_grantsuploaded')):
                self.render('save_profile.html', settings=msettings)
            else:
                self.redirect('/upload-codes')
    def post(self):
        try:
            # get user id from cookie. Must have
            user_id = self.get_secure_cookie('madgikmining')
            if user_id is None:
                return
            # post case where the profile data is uploaded to create the profile file
            if 'createprofile' in self.request.arguments and self.request.arguments['createprofile'][0] == '1':
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
                cursor.execute("create table grants(c1)", parse=False)
                if 'poswords' in self.request.arguments and self.request.arguments['poswords'][0] != '{}':
                    # construct math string for positive words matching calculation with weights
                    pos_words = json.loads(self.request.arguments['poswords'][0])
                    cursor.executemany("insert into poswords(c1,c2) values(?,?)",
                              (
                                    (key, value,) for key, value in pos_words.iteritems()
                              )
                    )
                if 'negwords' in self.request.arguments and self.request.arguments['negwords'][0] != '{}':
                    # construct math string for negative words matching calculation with weights
                    neg_words = json.loads(self.request.arguments['negwords'][0])
                    cursor.executemany("insert into negwords(c1,c2) values(?,?)",
                              (
                                    (key, value,) for key, value in neg_words.iteritems()
                              )
                    )
                if 'filters' in self.request.arguments and self.request.arguments['filters'][0] != '{}':
                    # construct math string for negative words matching calculation with weights
                    filters = json.loads(self.request.arguments['filters'][0])
                    cursor.executemany("insert into filters(c1,c2) values(?,?)",
                              (
                                    (key, value,) for key, value in filters.iteritems()
                              )
                    )
                if numberOfGrantsUploaded(user_id, self.get_secure_cookie('madgikmining_grantsuploaded')) != 0:
                      cursor.execute("insert into grants select stripchars(c1) as c1 from (file '/tmp/p{0}.csv')".format(user_id))
                cursor.close()

                data = {}
                data['data'] = 1
                self.write(json.dumps(data))
                self.flush()
                self.finish()

        except Exception as ints:
            data = {}
            data['error'] = "<b style=\"color: red\">Something went very very wrong!</b>"
            self.write(json.dumps(data))
            self.finish()
            print ints

        try:
            cursor.close()
        except:
            pass


class profileCreationHandler(BaseHandler):
    def post(self):
        try:
            user_id = self.get_secure_cookie('madgikmining')
            if user_id is None:
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
            cursor.execute("create table grants(c1)", parse=False)
            if 'poswords' in self.request.arguments and self.request.arguments['poswords'][0] != '{}':
                # construct math string for positive words matching calculation with weights
                pos_words = json.loads(self.request.arguments['poswords'][0])
                cursor.executemany("insert into poswords(c1,c2) values(?,?)",
                          (
                                (key, value,) for key, value in pos_words.iteritems()
                          )
                )
            if 'negwords' in self.request.arguments and self.request.arguments['negwords'][0] != '{}':
                # construct math string for negative words matching calculation with weights
                neg_words = json.loads(self.request.arguments['negwords'][0])
                cursor.executemany("insert into negwords(c1,c2) values(?,?)",
                          (
                                (key, value,) for key, value in neg_words.iteritems()
                          )
                )
            if 'filters' in self.request.arguments and self.request.arguments['filters'][0] != '{}':
                # construct math string for negative words matching calculation with weights
                filters = json.loads(self.request.arguments['filters'][0])
                cursor.executemany("insert into filters(c1,c2) values(?,?)",
                          (
                                (key, value,) for key, value in filters.iteritems()
                          )
                )
            if numberOfGrantsUploaded(user_id, self.get_secure_cookie('madgikmining_grantsuploaded')) != 0:
                  cursor.execute("insert into grants select stripchars(c1) as c1 from (file '/tmp/p{0}.csv')".format(user_id))
            cursor.close()

            self.write(json.dumps({'respond': "File ploaded.<br><b>1 Code</b> loaded! <i>Please make sure that you separate each code with newline!</i>"}))

        except Exception as ints:
            self.write(json.dumps({'respond': "<b style=\"color: red\">Mining profile couldn't be saved!</b>"}))
            print ints
            return
        self.finish()


class profileServeHandler(BaseHandler):
    passwordless=True
    def get(self):
        try:
            user_id = self.get_secure_cookie('madgikmining')
            if user_id is None:
                return
            if 'saveprofile' in self.request.arguments:
                print "asda"
                profile_file_name = "/tmp/OAMiningProfile_{0}.oamp".format(user_id)
                buf_size = 4096
                self.set_header('Content-Type', 'application/octet-stream')
                self.set_header('Content-Disposition', 'attachment; filename=' + "OAMiningProfile_{0}.oamp".format(user_id))
                self.flush()
                with open(profile_file_name, 'r') as f:
                    while True:
                        data = f.read(buf_size)
                        if not data:
                            break
                        self.write(data)
                self.finish()
                # TODO delete file after sending if needed

        except Exception as ints:
            self.write(json.dumps({'respond': "<b style=\"color: red\">Something went very wrong!</b>"}))
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

    def getparams(app):
        qparams=re.findall('%{(.*?)}',app['query'], re.UNICODE )
        return set(qparams)

    def getqueries():
        query_dir = os.path.abspath(os.path.join(os.path.dirname(__file__),'queries'))
        for dir, _, files in os.walk(query_dir):
            for file in files:
                if file.endswith('.sql'):
                    queries[os.path.splitext(file)[0]] = open(os.path.join(dir,file), 'r').read()
                    if msettings.DEBUG:
                        tornado.autoreload.watch(os.path.join(dir,file))
    
    def getexamples(app):
        if "examples" not in app:
            return []
        fullexamples=[]
        if type(app["examples"])==list:
            i=0
            for el in app["examples"]:
                i+=1
                d={}
                d["name"]='ex'+str(i)
                d["paramstring"]=str(el).replace('{','').replace('}','').replace("'",'')
                d["paramarray"]=json.dumps(el)
                fullexamples.append(d)
        else:
            for el in app["examples"]:
                d={}
                d["name"]=el
                d["paramstring"]=str(app["examples"][el]).replace('{','').replace('}','').replace("'",'')
                d["paramarray"]=json.dumps(app["examples"][el])
                fullexamples.append(d)
            fullexamples.sort(key=lambda x:x["name"])
        return fullexamples

    def processtemplate(app):
        if 'template' not in app:
            return

    getqueries()

    if 'initial_queries' in queries:
        try:
            list(msettings.Connection.cursor().execute(queries['initial_queries']))
        except Exception, e:
            raise Exception("Error when executing DB_INITIAL_EXECUTE:\n"+queries['initial_queries']+"\nThe error was:\n"+ str(e))
    
    tornado.options.parse_command_line()
    
    # Restructure applications
    logging.info('Running madApp startup scripts')
    
    for app in madapps.apps:

        app['link']=app['link'].lower()
        if "title" not in app:
            app["title"]=app['link']
        if "linktitle" not in app:
            app["linktitle"]=app["title"]

        if 'startup' in app:
            c=msettings.Connection.cursor()
            logging.info('Running startup queries for app'+app['linktitle']+' :\n'+app['startup'])
            c.execute(app['startup'])
            c.close()

        app["qtext"]=getqtext(app["query"], [p['name'] for p in app['params']])
        app["examples"]=getexamples(app)
        app['datavisualizations']=dict([(x,[y['visualizations']] if type(y['visualizations'])==dict else y['visualizations']) for x,y in app.iteritems() if type(y)==dict and 'query' in y])
        if 'query' in app:
            app['datavisualizations']['query']=copy.deepcopy(app['visualisations'])
        for vis in app['visualisations']:
            vis['viswidgetmap']=viswidgetmap[vis['name'].lower()]

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
