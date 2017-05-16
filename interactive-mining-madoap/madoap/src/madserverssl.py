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
            (r"/", HomeHandler),
            (r"/(?i)"+msettings.APPDIRNAME+"/analyze", madAppMiningServices),
            (r"/(?i)"+msettings.APPDIRNAME+"/classifier", madAppMiningServices),
            (r"/(?i)"+msettings.APPDIRNAME+"/datacitations", madAppMiningServices),
            (r"/(?i)"+msettings.APPDIRNAME+"/citations", madAppMiningServices),
            (r"/(?i)"+msettings.APPDIRNAME+"/docsim", madAppMiningServices),
            (r"/(?i)"+msettings.APPDIRNAME+"/software", madAppMiningServices),
            (r"/(?i)"+msettings.APPDIRNAME+"/pdbs", madAppMiningServices),
            (r"/(?i)"+msettings.APPDIRNAME+"/images", madAppMiningServices),
            (r"/(?i)"+msettings.APPDIRNAME+"/interactivemining", madAppQueryGenerator),
            (r"/(?i)"+msettings.APPDIRNAME+"/interactivemining/importing-controller", importingControllerHandler), 
            (r"/(?i)"+msettings.APPDIRNAME+"/?$", madAppBarHandler),
            (r"/(?i)"+msettings.APPDIRNAME+"/[^/]+/?$", madAppHandler),
            (r"/(?i)"+msettings.APPDIRNAME+"/[^/]+/.+$", madAppDataHandler)
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

class madAppMiningServices(BaseHandler):
    passwordless=True
    def get(self):
        if 'data' in self.request.arguments:
            return
        else:
            if self.request.uri == r"/" + msettings.APPDIRNAME + "/analyze":
                self.render('analyze.html',settings=msettings)
            elif self.request.uri == r"/" + msettings.APPDIRNAME + "/classifier":
                self.render('classifier.html',settings=msettings)
            elif self.request.uri == r"/" + msettings.APPDIRNAME + "/datacitations":
                self.render('datacitations.html',settings=msettings)
            elif self.request.uri == r"/" + msettings.APPDIRNAME + "/citations":
                self.render('citations.html',settings=msettings)
            elif self.request.uri == r"/" + msettings.APPDIRNAME + "/docsim":
                self.render('similarity.html',settings=msettings)
            elif self.request.uri == r"/" + msettings.APPDIRNAME + "/software":
                self.render('software.html',settings=msettings)
            elif self.request.uri == r"/" + msettings.APPDIRNAME + "/pdbs":
                self.render('pdbs.html',settings=msettings)
            elif self.request.uri == r"/" + msettings.APPDIRNAME + "/images":
                self.render('images.html',settings=msettings)
                
    def post(self):
        
        if self.request.uri in URIdemultiplex:
            self.request.arguments[ URIdemultiplex[self.request.uri] ] = ['on']

        data = {}
        try:
            if 'document' in self.request.arguments:
                doc = self.request.arguments['document'][0]
            else:
                if 'image' in self.request.files:
                    fileinfo = self.request.files['image'][0]
                    fname = fileinfo['filename']
                else:
                    return
            if 'document' in self.request.arguments:
                try:
                    doc = unicode(doc, 'utf_8', errors = 'ignore')
                except:
                    doc = ''
                    if msettings.DEBUG:
                        raise

            cursor=msettings.Connection.cursor()
            if 'projects' in self.request.arguments and self.request.arguments['projects'][0] in trueset:
                list(cursor.execute(r"select var('doc', regexpr('(\b\S*?[^0-9\s_]\S*?\s_?)(\d{3})(\s)(\d{3})(_?\s\S*?[^0-9\s_]\S*?\b)',filterstopwords(normalizetext(lower(?))),'\1\2\4\5'))", (doc,), parse=False))
                list(cursor.execute(r"select var('doc_unprocessed', ?)", (doc,), parse=False))
                list(cursor.execute(r"select var('doc2', regexpr('\n',comprspaces(?),' '))", (doc,), parse=False))
                query = queries['fundingminequery']
                data['funding_info'] = [OrderedDict([('fund', r[0]),('acronym', r[1]),('grantid', r[2]),('confidence', r[3]),('EGI-related',True if r[4]==1 else False)]) for r in cursor.execute(query)]


            if 'datacitations' in self.request.arguments and self.request.arguments['datacitations'][0] in trueset:
                if doc.count('\n')>10:
                    list(cursor.execute(r"select var('doc', normalizetext(textreferences(?)))", (doc,), parse=False))
                else:
                    list(cursor.execute(r"select var('doc', normalizetext(?))", (doc,), parse=False))
                list(cursor.execute(r"select var('doc2', comprspaces(filterstopwords(regexpr('(/|:)(\n)',?,'\1'))))", (doc,), parse=False))
                query = queries['datacitationsquery']
                data['datacitation_info'] = [OrderedDict([('organization', r[0]),('related_doi', r[1]),('confidence', r[2]),('resource_type', r[3])]) for r in cursor.execute(query)]


            if 'classification' in self.request.arguments and self.request.arguments['classification'][0] in trueset:
                print list(cursor.execute(r"select var('doc', (stem(filterstopwords(keywords(?)))))", (doc,), parse=False))
                
                query = queries['classifierquery']
                data['classification_info'] = [OrderedDict([('taxonomy', r[0]),('class', r[1]),('confidence', r[2])]) for r in cursor.execute(query)]

            if 'pdb' in self.request.arguments and self.request.arguments['pdb'][0] in trueset:
                list(cursor.execute(r"select var('doc', comprspaces(lower(filterstopwords(regexpr('[^\w-]',?,' ')))) )", (doc,), parse=False))
                query = queries['pdbquery']
                data['pdb_info'] = [OrderedDict([('pdbid', r[0])]) for r in cursor.execute(query)]
            if 'software' in self.request.arguments:
                list(cursor.execute(r"select var('doc6', ?)", (doc,), parse=False))
                query = queries['software']
                data['software_info'] = [OrderedDict([('softwareURL', r[0])]) for r in cursor.execute(query)]
            if 'image' in self.request.files:
               pass
        except:
            if msettings.DEBUG:
                raise

        try:
            cursor.close()
        except:
            pass
        if not self.request.files:
            self.write(json.dumps(data))
            self.flush()
        else :
            #<img src=
            #from tempfile import NamedTemporaryFile
            fileinfo = self.request.files['image'][0]
            fname = fileinfo['filename']
            #f = NamedTemporaryFile(delete=False)
            
            f = open("static/uploads/"+fname,"wb")
            f.write(fileinfo['body'])
            import Image
            try:
                im=Image.open('static/uploads/'+fname)
                lala = msettings.imageSearch.search(['imageSearch.py', '-query','static/uploads/'+fname , '0'])
                self.write('<br>Query image:<br>')
                self.write('<img src="/static/uploads/'+fname+'" style="width:304px;height:228px"><br><br>')
                self.write('<br>Returned images:<br>')
                for i in lala:
                    self.write('<img src="/static/images/'+i+'" style="width:304px;height:228px"><br><br>')
            except IOError:
                self.write('Not an image file')
                os.unlink('static/uploads/'+fname)
           
            self.flush()



class madAppQueryGenerator(BaseHandler):
    passwordless=True
    def get(self):
        if 'data' in self.request.arguments:
            return
        else:
            user_id = self.get_secure_cookie('madgikmining')
            #print "old", user_id
            if not user_id:
                user_id = 'user%s' % (datetime.datetime.now().microsecond + (random.randrange(1, 100+1) * 100000))
                #print "new", user_id
                self.set_secure_cookie('madgikmining', user_id)
            #encoded = jwt.encode({'user': user_id}, 'secret', algorithm='HS256')
            self.render('interactivemining.html', settings=msettings)

                
    def post(self):
        
        if self.request.uri in URIdemultiplex:
            self.request.arguments[ URIdemultiplex[self.request.uri] ] = ['on']

        user_id = self.get_secure_cookie('madgikmining')

        data = {}
        try:
            if 'fileuploaded' not in self.request.arguments or ('fileuploaded' in self.request.arguments and self.request.arguments['fileuploaded'][0] not in trueset):
                self.write(json.dumps({'error': "A file <b>must</b> be uploaded first!"}))
                return
            if 'document' in self.request.arguments:
                doc = self.request.arguments['document'][0]
                try:
                    doc = unicode(doc, 'utf_8', errors = 'ignore')
                except:
                    doc = ''
                    if msettings.DEBUG:
                        raise

            cursor=msettings.Connection.cursor()

            pos_set = neg_set = ''

            if 'poswords' in self.request.arguments:
                cursor.execute("drop table if exists pos%s" % (user_id))
                cursor.execute("create temp table pos%s(words)" % (user_id))

                # cursor.executemany("insert into pos" + user_id + "(words) values(?)",
                #           (
                #                 ('(?:\b)'+x+'(?:\b)',) for x in self.request.arguments['poswords'][0][:-1].split('|')
                #           )
                # )
                cursor.executemany("insert into pos" + user_id + "(words) values(?)",
                          (
                                (r"(?:\b)%s(?:\b)" % (x),) for x in self.request.arguments['poswords'][0][:-1].split('|')
                          )
                )
                cursor.execute("hidden var 'varpos%s' from select jmergeregexp(jgroup(words)) from (select * from pos%s order by length(words) desc)" % (user_id, user_id))
                #data['poswords'] = [r for r in cursor.execute('select * from pos%s' % (user_id))]
                cursor.execute("drop table if exists pos%s" % (user_id))
                pos_set = "regexpcountuniquematches(var('varpos%s'),j2s(prev,middle,next))" % (user_id)
            if 'negwords' in self.request.arguments:
                cursor.execute("drop table if exists neg%s" % (user_id))
                cursor.execute("create temp table neg%s(words)" % (user_id))
                cursor.executemany("insert into neg" + user_id + "(words) values(?)",
                          (
                                (r"(?:\b)%s(?:\b)" % (x),) for x in unicode(self.request.arguments['negwords'][0][:-1], 'utf_8', errors = 'ignore').split('|')
                          )
                )
                cursor.execute("hidden var 'varneg%s' from select jmergeregexp(jgroup(words)) from (select * from neg%s order by length(words) desc)" % (user_id, user_id))
                #data['negwords'] = [r for r in cursor.execute("select var('varneg%s')" % (user_id))]
                cursor.execute('drop table if exists neg%s' % (user_id))
                neg_set = "regexpcountuniquematches(var('varneg%s'),j2s(prev,middle,next))" % (user_id)

            doc_filters = "regexpr('[\n|\r]',?,' ')"
            if 'keywords' in self.request.arguments and self.request.arguments['keywords'][0] in trueset:
                doc_filters = 'keywords('+doc_filters+')'
            if 'lowercase' in self.request.arguments and self.request.arguments['lowercase'][0] in trueset:
                doc_filters = 'lower('+doc_filters+')'
            if 'stopwords' in self.request.arguments and self.request.arguments['stopwords'][0] in trueset:
                doc_filters = 'filterstopwords('+doc_filters+')'

            cursor=msettings.Connection.cursor()
            if 'document' in self.request.arguments and self.request.arguments['document'][0] != '':
                list(cursor.execute("select var('doc"+user_id+"', "+doc_filters+")", (doc,), parse=False))
                conf = ''
                if pos_set != '' and neg_set != '':
                    conf = ", (%s - %s)" % (pos_set, neg_set)
                elif pos_set != '':
                    conf = ", %s" % (pos_set)
                elif neg_set != '':
                    conf = ", %s" % (neg_set)
                if conf != '':
                    conf += ' as conf'
                query = "select c1 %s from (select textwindow2s(var('doc%s'),10,1,5)), (cache select stripchars(c1) as c1 from (file '/tmp/p%s.csv')) T where middle = T.c1" % ('', user_id, user_id)
                data['funding_info'] = [{"code": r[0]} for r in cursor.execute(query)]
        except:
            if msettings.DEBUG:
                raise

        try:
            cursor.close()
        except:
            pass
        self.write(json.dumps(data))
        self.flush()


class importingControllerHandler(BaseHandler):
    def post(self):
        """Controls the importing job as follows:
            *** load-raw-data (reading and saving them in the DB)"""

        try:

            user_id = self.get_secure_cookie('madgikmining')

            csv_file_name = "/tmp/p%s.csv" % (user_id)
            csv_file = open(csv_file_name, 'w')

            body_split = [l.strip() for l in StringIO.StringIO(self.request.body).readlines()]
            if body_split[3:5][0] == 'example':
                #static/fp7grants.csv

                fp7_file = open("fp7grants.csv", 'r')

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
                    self.write(json.dumps({'respond': "File <b>"+file_name+"</b> uploaded.<br><b>1 Code</b> loaded! <i>Please make sure that you separate each code with newline!</i>"}))
                else:
                    self.write(json.dumps({'respond': "File <b>"+file_name+"</b> uploaded.<br><b>%s Codes</b> loaded successfully!" % (len(data))}))

            csv_file.close()

        except Exception as ints:
            self.write(json.dumps({'respond': "<b style=\"color: red\">File Failed to Upload!</b>"}))
            print ints
            return

        # try:
        #     cursor.close()
        # except:
        #     pass



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
        server = tornado.httpserver.HTTPServer(Application(),
                ssl_options = {
        "certfile": os.path.join("/home/openaire/ssl/certificate.crt"),
        "keyfile": os.path.join("/home/openaire/ssl/privateKey.key"),
})
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
