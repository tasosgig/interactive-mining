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
import re
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
            (r"/", madAppQueryGenerator),
            (r"/importing-controller", importingControllerHandler),
            (r"/importing-text-controller", importingTextsControllerHandler),
            (r"/save-config-controller", profileCreationHandler),
            (r"/download-config-controller", profileServeHandler),
            (r"/upload-profile-controller", profileUploadHandler),
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
        file_name = "/tmp/p%s.csv" % (user_id)
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


class madAppQueryGenerator(BaseHandler):
    passwordless=True
    # When loading the page first time and evry refresh
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
            # check if he already uploaded his grants ids and inform him via a message
            numOfGrants = numberOfGrantsUploaded(user_id, self.get_secure_cookie('madgikmining_grantsuploaded'))
            self.render('interactivemining.html', settings=msettings, numOfGrants=numOfGrants)


    def post(self):
        
        if self.request.uri in URIdemultiplex:
            self.request.arguments[ URIdemultiplex[self.request.uri] ] = ['on']

        # Get the unique user id from the coookie set
        user_id = self.get_secure_cookie('madgikmining')
        if user_id is None:
            return
        # data to be sent
        data = {}
        try:
            #  he must upload his grant ids first
            if numberOfGrantsUploaded(user_id, self.get_secure_cookie('madgikmining_grantsuploaded')) == 0:
                self.write(json.dumps({'error': "A codes file <b>must</b> be uploaded first!"}))
                return

            # 2 MODES of document upload:
            # 1. he pasted some text in the document input
            if 'document' in self.request.arguments:
                doc = self.request.arguments['document'][0]
                try:
                    doc = unicode(doc, 'utf_8', errors = 'ignore')
                except:
                    doc = ''
                    if msettings.DEBUG:
                        raise
            # 2. he already uploaded a txt of documents in json format
            elif ('docsfileuploaded' not in self.request.arguments or ('docsfileuploaded' in self.request.arguments and self.request.arguments['docsfileuploaded'][0] not in trueset)) or numberOfDocsUploaded(user_id) == 0:
                self.write(json.dumps({'error': "Documents <b>must</b> be uploaded!"}))
                return

            # create positive and negative words weighted regex text
            pos_set = neg_set = conf = whr_conf = ''
            if 'poswords' in self.request.arguments and self.request.arguments['poswords'][0] != '{}':
                # construct math string for positive words matching calculation with weights
                pos_words = json.loads(self.request.arguments['poswords'][0])
                for key, value in pos_words.iteritems():
                    pos_set += r'regexpcountuniquematches("(?:\b)%s(?:\b)",j2s(prev,middle,next))*%s + ' % (key,value)
                pos_set += "0"
            if 'negwords' in self.request.arguments and self.request.arguments['negwords'][0] != '{}':
                # construct math string for negative words matching calculation with weights
                neg_words = json.loads(self.request.arguments['negwords'][0])
                for key, value in neg_words.iteritems():
                    neg_set += r'regexpcountuniquematches("(?:\b)%s(?:\b)",j2s(prev,middle,next))*%s - ' % (key,value)
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
            # create temp table with grants
            list(cursor.execute("drop table if exists grants"+user_id, parse=False))
            query0 = "create temp table grants{0} as select stripchars(c1) as c3 from (file '/tmp/p{1}.csv')".format(user_id, user_id)
            cursor.execute(query0)
            if 'document' in self.request.arguments and self.request.arguments['document'][0] != '':
                doc_filters = "regexpr('[\n|\r]',?,' ')"
                if 'keywords' in self.request.arguments and self.request.arguments['keywords'][0] in trueset:
                    doc_filters = 'keywords('+doc_filters+')'
                if 'lowercase' in self.request.arguments and self.request.arguments['lowercase'][0] in trueset:
                    doc_filters = 'lower('+doc_filters+')'
                if 'stopwords' in self.request.arguments and self.request.arguments['stopwords'][0] in trueset:
                    doc_filters = 'filterstopwords('+doc_filters+')'
                list(cursor.execute("select var('doc"+user_id+"', "+doc_filters+")", (doc,), parse=False))

                #print 'query', [r for r in cursor.execute("select middle, j2s(prev,middle,next) %s from (select textwindow2s(var('doc%s'),10,1,5))" % (conf, user_id))]
                query1 = "select c1 {0} from (select textwindow2s(var('doc{1}'),10,1,5)), (cache select stripchars(c1) as c1 from (file '/tmp/p{2}.csv')) T where middle = T.c1 {3}".format(conf, user_id, user_id, whr_conf)
                data['funding_info'] = [{"code": r[0]} for r in cursor.execute(query1)]
            elif numberOfDocsUploaded(user_id) != 0:
                doc_filters = "regexpr('[\n|\r]',c2,' ')"
                if 'keywords' in self.request.arguments and self.request.arguments['keywords'][0] in trueset:
                    doc_filters = 'keywords('+doc_filters+')'
                if 'lowercase' in self.request.arguments and self.request.arguments['lowercase'][0] in trueset:
                    doc_filters = 'lower('+doc_filters+')'
                if 'stopwords' in self.request.arguments and self.request.arguments['stopwords'][0] in trueset:
                    doc_filters = 'filterstopwords('+doc_filters+')'
                list(cursor.execute("drop table if exists docs"+user_id, parse=False))
                query1 = "create temp table docs{0} as select c1, {1} as c2 from (setschema 'c1,c2' select jsonpath(c1, '$.id', '$.text') from (file '/tmp/docs{2}.json'))".format(user_id, doc_filters, user_id)
                cursor.execute(query1)

                query2 = "select c1, c3 {0} from (select c1, textwindow2s(c2,10,1,5) from (select * from docs{1})), (select c3 from grants{2}) T where middle = T.c3 {3}".format(conf, user_id, user_id, whr_conf)
                results = [r for r in cursor.execute(query2)]
                data['funding_info'] = [{"code": r[1]} for r in results]

        except Exception as ints:
            print ints
            if msettings.DEBUG:
                raise

        try:
            cursor.close()
        except:
            pass
        self.write(json.dumps(data))
        self.flush()
        self.finish()


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

class profileUploadHandler(BaseHandler):
    def post(self):
        try:
            user_id = self.get_secure_cookie('madgikmining')
            if user_id is None:
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


class importingControllerHandler(BaseHandler):
    def post(self):
        """Controls the importing job as follows:
            *** load-raw-data (reading and saving them in the DB)"""

        try:

            user_id = self.get_secure_cookie('madgikmining')
            if user_id is None:
                return
            csv_file_name = "/tmp/p{0}.csv".format(user_id)
            csv_file = open(csv_file_name, 'w')

            body_split = [l.strip() for l in StringIO.StringIO(self.request.body).readlines()]
            if body_split[3:5][0] == 'example':
                #static/fp7grants.csv

                fp7_file = open("static/fp7grants.csv", 'r')

                while 1:
                    copy_buffer = fp7_file.read(1048576)
                    if not copy_buffer:
                        break
                    csv_file.write(copy_buffer)

                # cursor = msettings.Connection.cursor()
                # cursor.execute('drop table if exists p%s' % (user_id))
                # cursor.execute('create temp table p%s(words)' % (user_id))
                # cursor.executemany("insert into p" + user_id + "(words) values(?)",
                #           (
                #                 ('246686',), ('283595',)
                #           )
                # )
                # try:
                #     cursor.close()
                # except:
                #     pass
                self.write(json.dumps({'respond': "<b style='color: #268D26'>25536 fp7 Codes</b> loaded successfully!"}))
                self.set_secure_cookie('madgikmining_grantsuploaded', "25536")
            elif body_split[3:5][0] == 'normal':
                importing_data = email.message_from_string('\n'.join(body_split[5:-1]))

                file_name = importing_data.get_filename()
                csvfile = importing_data.get_payload()
                dialect = csv.Sniffer().sniff(csvfile)
                data = list(csvfile.splitlines())

                for line in data:
                    csv_file.write(line+'\n')

                # cursor = msettings.Connection.cursor()
                # cursor.execute('drop table if exists p%s' % (user_id))
                # cursor.execute('create temp table p%s(words)' % (user_id))
                # cursor.executemany("insert into p" + user_id + "(words) values(?)",
                #           (
                #                 (x,) for x in itertools.islice(data, None)
                #           )
                # )
                if len(data) == 1:
                    self.write(json.dumps({'respond': "File <b>{0}</b> uploaded.<br><b>1 Code</b> loaded! <i>Please make sure that you separate each code with newline!</i>".format(file_name)}))
                else:
                    self.write(json.dumps({'respond': "File <b>{0}</b> uploaded.<br><b>{1} Codes</b> loaded successfully!".format(file_name, len(data))}))
                    self.set_secure_cookie('madgikmining_grantsuploaded', str(len(data)))

            csv_file.close()

        except Exception as ints:
            self.write(json.dumps({'respond': "<b style=\"color: red\">File Failed to Upload!</b>"}))
            print ints
            return



class importingTextsControllerHandler(BaseHandler):
    def post(self):
        """Controls the importing job as follows:
            *** load-raw-data (reading and saving them in the DB)"""

        try:
            # get user id from cookie. Must have
            user_id = self.get_secure_cookie('madgikmining')
            if user_id is None:
                return
            # get file info and body from post data
            fileinfo = self.request.files['upload'][0]
            fname = fileinfo['filename']
            extn = os.path.splitext(fname)[1]
            # must be .pdf or .json
            if extn != ".txt" and extn != ".pdf":
                self.write(json.dumps({'respond': "<b style=\"color: red\">File must be .pdf or .txt</b>"}))
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
                    self.write(json.dumps({'respond': "<b style=\"color: red\">Cannot convert .pdf to .txt</b>"}))
                    return
                os.remove(cname)
                cname = "/tmp/docs{0}.txt".format(user_id)
                with open(cname, 'r') as fin:
                    data=fin.read().replace('\n', ' ')
                    if len(data)==0:
                        self.write(json.dumps({'respond': "<b style=\"color: red\">Cannot convert .pdf to .txt</b>"}))
                        return
                with open("/tmp/docs{0}.json".format(user_id), "wb") as fout:
                    json.dump({"text":data,"id":os.path.splitext(fname)[0]}, fout)
                os.remove(cname)
            # else check if txt is in correct json format
            elif extn == ".txt":
                try:
                    jsonlist = []
                    for line in open(cname, 'r'):
                        jsonlist.append(json.loads(line))
                    os.rename(cname, "/tmp/docs{0}.json".format(user_id))
                except ValueError, e:
                    self.write(json.dumps({'respond': "<b style=\"color: red\">File is not in a valid json format</b>"}))
                    os.remove(cname)
                    print e
                    return
            self.write(json.dumps({'respond': "File <b>{0}</b> uploaded successfully!<br>".format(fname)}))

        except Exception as ints:
            self.write(json.dumps({'respond': "<b style=\"color: red\">File Failed to Upload!</b>"}))
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
