var file = require('fs');
var sessions = require("sessions");
var cookies = require("cookies");
var keygrip = require("keygrip");
var event = require("events").EventEmitter;
var frameworkversion = "LGX_Framework v1.0";

function echo(msg){
//console.log(msg);
}

var FileBuff = {};//<- Przechowuje buff pliku. aby za kazdym razem go z dysku nie odczytywac.

function AddFileBuff(name,buff){
    Object.defineProperty(FileBuff, name, {
        writable: true,
        enumerable: true,
        configurable: true,
        value:buff
    });
}

function GetFileBuff(name){
    var ele = FileBuff[name]
    if(ele){
        return FileBuff[name];
    }else{
        return null;
    }
}

function ReadFile(filename,callback){
    var buff = GetFileBuff(filename);

    echo('file:'+filename);
    if (callback){
        if (filename){
            if(buff){
                echo('odczyt z Buff!');
                buff.response = 200;
                buff.responseText = 'OK';
                callback(buff);
            }else
                file.readFile(filename,function(err,dat){
                    if (err == null){
                        AddFileBuff(filename,{
                            filename:filename,
                            buff:dat,
                            response:200,
                            responseText : 'OK'
                        });
                        echo('odczyt z hdd!');
                        callback({
                            filename:filename,
                            buff:dat,
                            response:200,
                            responseText : 'OK'
                        });
                    }else{
                        echo('Blad otwierania pliku: '+filename);
                        callback({
                            filename:filename,
                            buff:null,
                            response:404,
                            responseText : 'File not find'
                        });
                    }
                });
        }else{
            echo('Blad otwierania pliku: Nie podano pliku');
            callback({
                filename:filename,
                buff:null,
                response:404,
                responseText : 'Not specified file'
            });
        }
    }else{
        if (filename){
            if(buff.buff){
                buff.response = 200;
                buff.responseText = 'OK';
                return buff;
            }else{
                var exist = require('path').existsSync(filename);
                if (exist){
                    var dat = file.readFileSync(filename);
                    AddFileBuff(filename,{
                        filename:filename,
                        buff:dat,
                        response:200,
                        responseText : 'OK'
                    });
                    echo('odczyt z hdd!');
                    return {
                        filename:filename,
                        buff:dat,
                        response:200,
                        responseText : 'OK'
                    };
                }else{
                    echo('Blad otwierania pliku: '+filename);
                    return {
                        filename:filename,
                        buff:null,
                        response:404,
                        responseText : 'File not find'
                    };
                }
            }

        }else{
            echo('Blad otwierania pliku: Nie podano pliku');
            return {
                filename:filename,
                buff:null,
                response:'404',
                responseText : 'Not specified file'
            };
        }

    }
    return false;
}

var urlParse = function(str,separator2,separator1){
    separator1 = separator1?separator1:'&';
    separator2 = separator2?separator2:'=';
    var obj = {},arr = [];
    arr = str.split(separator1);
    for(var y in arr){
        var dat = arr[y].split(separator2);
        Object.defineProperty(obj, dat[0], {
            writable: true,     // b�dzie mo�na ustawic warto��
            enumerable: true,   // b�dzie wida� w for-in, in
            configurable: true, // b�dzie mo�na zmieni� deskryptor
            value:dat[1]
        });
    }
    return obj;
};

function CreateServerHttp(port,host){
    var _this = this;
    this.port = port || 80;
    //this.host = host || '127.0.0.1';
    this.host = host;
    this.session = new sessions(0);
    this.event = new event();
    var server = require('http').createServer();
    
    this.listen = function(callback){
        server.listen(this.port,this.host,callback);
        //this.server.listen(this.port,this.host,callback);
        //this.server.on('request',function(req,res){
        server.on('request',function(req,res){
            var url= require('url').parse(req.url,true),
            _url = url.pathname.split('/'),
            controler = url.pathname.split('/')[1],
            model = url.pathname.split('/')[2],
            query = url.query;        

            var cookie = new cookies(req,res,keygrip);            
            
            var method = req.method;
            var Data = {
                url : _url,
                cookie:cookie || undefined,
                request:req,
                response:res,
                post : undefined,
                postenctype : undefined,
                get: query || undefined,
                getenctype : undefined,
                controler:controler || undefined,
                model : model || undefined,
                event : _this.event
            }
            
            var sessionID = Data.cookie.get('session')?Data.cookie.get('session'):'1';
            var session = new sessions(sessionID);
            session.set({
                "_parent":Data
            });
            Data.session = session;
            cookie.set('session',Data.session.sessionID);

            switch (method) {
                case 'POST':{
                    req.on("data", function (pos) {
                        Data.datapost = pos;
                        // console.log('file:',pos.toString());
                        Data.post = urlParse(pos.toString());
                    });
                    req.on("end", function () {
                        _this.ExecutePOSTControler(Data,function(objHtml){
                            _this.view(res,objHtml);
                        });
                    });
                    break;
                }
                default:{
                    _this.ExecuteGETControler(Data,function(objHtml){
                        _this.view(res,objHtml);
                    });
                    
                    break;
                }
            }
        });
    };

    this.NewPOSTControler = function(controler,config){
        var value = {
            includefile : config.includefile,
            virtual : config.virtual ? config.virtual : false,
            head : config.head || _this.defaultHeadFn,
            //head : config.head ? config.head : {'Content-Type':'text/plain'},
            model : config.fn
        }
        var obj = {};

        var ControlerExist = this.controlersPOST[controler] ? true : false;
        if (ControlerExist){
            var ModelExist = this.controlersPOST[controler][config.name] ? true : false;
            if (ModelExist){
                this.controlersPOST[controler][config.name] = value;
            }else{
                Object.defineProperty(this.controlersPOST[controler], config.name ? config.name : '*', {
                    writable: true,   
                    enumerable: true, 
                    configurable: true,
                    value:value
                });
            }
        }else{
            Object.defineProperty(obj, config.name ? config.name : '*', {
                writable: true,
                enumerable: true,
                configurable: true,
                value:value
            });
            Object.defineProperty(this.controlersPOST, controler, {
                writable: true,     // b�dzie mo�na ustawic warto��
                enumerable: true,   // b�dzie wida� w for-in, in
                configurable: true, // b�dzie mo�na zmieni� deskryptor
                value:obj
            });
        }
    }

    this.NewGETControler = function(controler,config){
        var _this = this;
        var value = {
            includefile : config.includefile,
            virtual : config.virtual || false,
            head : config.head || _this.defaultHeadFn,
            //head : config.head || {'Content-Type':'text/plain'},
            model : config.fn
        }
        var obj = {};
        
        var ControlerExist = this.controlersGET[controler] ? true : false;
        if (ControlerExist){
            var ModelExist = this.controlersGET[controler][config.name] ? true : false;
            if (ModelExist){
                this.controlersGET[controler][config.name] = value;
            }else{
                Object.defineProperty(this.controlersGET[controler], config.name ? config.name : '*', {
                    writable: true,
                    enumerable: true,
                    configurable: true,
                    value:value
                });
            }
        }else{
            Object.defineProperty(obj, config.name ? config.name : '*', {
                writable: true,
                enumerable: true,
                configurable: true,
                value:value
            });
            Object.defineProperty(this.controlersGET, controler, {
                writable: true,
                enumerable: true,
                configurable: true,
                value:obj
            });
        }  
    }
    this.SetDefaultHead = function(obj){
        for(var i in obj){
            Object.defineProperty(this.defaultHead, i, {
                writable: true,
                enumerable: true,
                configurable: true,
                value:obj[i]
            });
        }

    }
    this.clearbuff = function(){
        FileBuff = {};
    }
}


CreateServerHttp.prototype.defaultHead = {};

CreateServerHttp.prototype.defaultHeadFn = function (file){
    var extensionSplit = file.split(".");
    var extensionLength = extensionSplit.length;
    var extensionFile = extensionSplit[extensionLength-1];

    function ContentType(ext) {
        if(this.defaultHead[ext]){
            return this.defaultHead[ext]
        }else{
            return 'text/plain'
        }
    }
    
    var _return = {
        "Content-Type":ContentType.call(this,extensionFile)//,"X-File" : file
    }

    return _return;
};

//CreateServerHttp.prototype.server = require('http').createServer();

CreateServerHttp.prototype.controlersGET = {};
CreateServerHttp.prototype.controlersPOST = {};

CreateServerHttp.prototype.view = function (response,_objHtml){
    //console.log("objHtml.head::")
    //console.log(objHtml.head)
    var objHtml = _objHtml;
    if (!objHtml.head)
        objHtml.head = {
            'Content-Type':'text/plain'
        }

    Object.defineProperty(objHtml.head, "Server", {
        writable: true,
        enumerable: true,
        configurable: true,
        value:"nodeJS / "+frameworkversion
    });


    if (objHtml.body){      
        Object.defineProperty(objHtml.head, "Content-Length", {
            writable: true,
            enumerable: true,
            configurable: true,
            value:objHtml.body.length
        });
    }else {
        Object.defineProperty(objHtml.head, "Content-Length", {
            writable: true,
            enumerable: true,
            configurable: true,
            value:0
        });
    }

    //console.log("objHtml.head:",objHtml.head);

    response.writeHead(objHtml.response || 500,objHtml.responseText || '',objHtml.head);
    if (objHtml.body)  response.write(objHtml.body);
    response.end();
};

CreateServerHttp.prototype.ExecuteGETControler = function(Data,cb){
    var _this = this;
    if(Data.controler === undefined) Data.controler = '';
    var obj = {
        url : Data.url,
        session : Data.session,
        cookie : Data.cookie,
        request : Data.request,
        response : Data.response,
        controler : Data.controler,
        model : Data.model,
        post : Data.post,
        postenctype : Data.postenctype,
        get : Data.get,
        getenctype : Data.getenctype,
        document : '',
        event : Data.event
    };
    
    if (this.controlersGET[Data.controler] ? true : false){
        // console.log("this.controlersGET[Data.controler]:",this.controlersGET[Data.controler],'\n');
        if(this.controlersGET[Data.controler][Data.model]){
            
            if(typeof this.controlersGET[Data.controler][Data.model].head == 'object'){
                obj.head = this.controlersGET[Data.controler][Data.model].head;
            }else if(typeof this.controlersGET[Data.controler][Data.model].head == 'function'){
                obj.head = this.controlersGET[Data.controler][Data.model].head.call(_this,Data.model);
            } else {
                obj.head = undefined;
            }
            //obj.head = this.controlersGET[Data.controler][Data.model].head;
            obj.filename = this.controlersGET[Data.controler][Data.model].includefile;
            if (!this.controlersGET[Data.controler][Data.model].virtual){
                ReadFile('./'+Data.controler+'/'+Data.model,function(file){
                    obj.file = file;
                    obj.document = {
                        body : obj.file.buff,
                        response : obj.file.response,
                        responseText : obj.file.responseText,
                        //head : _this.controlersGET[Data.controler][Data.model].head
                        head : obj.head
                    }
                    
                    if(_this.controlersGET[Data.controler][Data.model].model){
                        if (_this.controlersGET[Data.controler][Data.model].includefile){

                            if (typeof _this.controlersGET[Data.controler][Data.model].includefile == 'object'){
                                var fileTab = [];
                                var count = _this.controlersGET[Data.controler][Data.model].includefile.length-1;
                                var i = 0;
                                for(var objx in _this.controlersGET[Data.controler][Data.model].includefile){
                                    ReadFile(_this.controlersGET[Data.controler][Data.model].includefile[objx],function(file_){
                                        fileTab.push(file_);

                                        if (i == count){
                                            _this.controlersGET[Data.controler][Data.model].model.call(obj,cb,fileTab);
                                        }
                                        i++;
                                    });
                                }
                            }else
                            {                                
                                ReadFile(_this.controlersGET[Data.controler][Data.model].includefile,function(file_){
                                    _this.controlersGET[Data.controler][Data.model].model.call(obj,cb,file_);
                                });
                            }
                        }else _this.controlersGET[Data.controler][Data.model].model.call(obj,cb);
                    }else{
                        cb({
                            body : obj.file.buff,
                            response : obj.file.response,
                            responseText : obj.file.responseText,
                            //head : _this.controlersGET[Data.controler][Data.model].head
                            head : obj.head
                        });
                    }
                });
            }else{
                
                obj.document = {
                    body : '',
                    response : 404,
                    head : _this.controlersGET[Data.controler][Data.model].head
                //head : obj.head
                }
                if(_this.controlersGET[Data.controler][Data.model].model){
                    if (_this.controlersGET[Data.controler][Data.model].includefile){

                        if (typeof _this.controlersGET[Data.controler][Data.model].includefile == 'object'){
                            var fileTab = [];
                            var count = _this.controlersGET[Data.controler][Data.model].includefile.length-1;
                            var i = 0;
                            for(var objx in _this.controlersGET[Data.controler][Data.model].includefile){
                                ReadFile(_this.controlersGET[Data.controler][Data.model].includefile[objx],function(file_){
                                    fileTab.push(file_);

                                    if (i == count){
                                        _this.controlersGET[Data.controler][Data.model].model.call(obj,cb,fileTab);
                                    }
                                    i++;
                                });
                            }
                        }else{                        
                            ReadFile(_this.controlersGET[Data.controler][Data.model].includefile,function(file_){
                                _this.controlersGET[Data.controler][Data.model].model.call(obj,cb,file_);
                            });
                        }
                    }else _this.controlersGET[Data.controler][Data.model].model.call(obj,cb);
                }else{
                    cb({
                        body : '',
                        response : 404,
                        head : _this.controlersGET[Data.controler][Data.model].head
                    //head : obj.head
                    });
                }
            }
        }else  if(this.controlersGET[Data.controler]['*']){
            // obj.head = this.controlersGET[Data.controler]['*'].head;
            
            if (!_this.controlersGET[Data.controler]['*'].virtual){                
                obj.filename = _this.controlersGET[Data.controler]['*'].includefile;
                var newFile = Data.model ? Data.model : obj.includefile;
                if(typeof this.controlersGET[Data.controler]["*"].head == 'object'){
                    obj.head = this.controlersGET[Data.controler]["*"].head;
                }else if(typeof this.controlersGET[Data.controler]["*"].head == 'function'){
                    if (newFile)
                        obj.head = this.controlersGET[Data.controler]["*"].head.call(_this,newFile);
                    else obj.head = undefined;
                } else {
                    obj.head = undefined;
                }

                ReadFile('./'+Data.controler+'/'+newFile,function(file){
                  
                    obj.file = file;
                    obj.document = {
                        body : obj.file.buff,
                        response : obj.file.response,
                        responseText : obj.file.responseText,
                        //head : _this.controlersGET[Data.controler]['*'].head
                        head : obj.head
                    }
                    if(_this.controlersGET[Data.controler]['*'].model){
                        if (_this.controlersGET[Data.controler]['*'].includefile){                            
                            if (typeof _this.controlersGET[Data.controler]['*'].includefile == 'object'){
                                var fileTab = [];
                                var count = _this.controlersGET[Data.controler]['*'].includefile.length-1;
                                var i = 0;
                                for(var objx in _this.controlersGET[Data.controler]['*'].includefile){
                                    ReadFile(_this.controlersGET[Data.controler]['*'].includefile[objx],function(file_){
                                        fileTab.push(file_);
                                        
                                        if (i == count){
                                            _this.controlersGET[Data.controler]['*'].model.call(obj,cb,fileTab);
                                        }
                                        i++;
                                    });
                                }
                            }else{
                                ReadFile(_this.controlersGET[Data.controler]['*'].includefile,function(file_){
                                    _this.controlersGET[Data.controler]['*'].model.call(obj,cb,file_);
                                });
                            }
                        }else _this.controlersGET[Data.controler]['*'].model.call(obj,cb);
                    }else{
                        cb({
                            body : obj.file.buff,
                            response : obj.file.response,
                            responseText : obj.file.responseText,
                            //head : _this.controlersGET[Data.controler]['*'].head
                            head : obj.head
                        });
                    }
                });
            }else{
                obj.document = {
                    body : '',
                    response : 404,
                    //head : obj.head
                    head : _this.controlersGET[Data.controler]['*'].head
                }
                
                if(_this.controlersGET[Data.controler]['*'].model){                    
                    if (_this.controlersGET[Data.controler]['*'].includefile){
                        if (typeof _this.controlersGET[Data.controler]['*'].includefile == 'object'){
                            var fileTab = [];
                            var count = _this.controlersGET[Data.controler]['*'].includefile.length-1;
                            var i = 0;
                            for(var objx in _this.controlersGET[Data.controler]['*'].includefile){
                                ReadFile(_this.controlersGET[Data.controler]['*'].includefile[objx],function(file_){
                                    fileTab.push(file_);
                                    if (i == count){
                                        _this.controlersGET[Data.controler]['*'].model.call(obj,cb,fileTab);
                                    }
                                    i++;
                                });
                            }
                        }else{
                            ReadFile(_this.controlersGET[Data.controler]['*'].includefile,function(file_){
                                _this.controlersGET[Data.controler]['*'].model.call(obj,cb,file_);
                            });
                        }
                    }else {                        
                        obj.document = {
                            body : '',
                            response : 404,
                            head : _this.controlersGET[Data.controler]['*'].head
                        }
                        //console.log("head:--",obj,'\n');                        
                        _this.controlersGET[Data.controler]['*'].model.call(obj,cb);
                    }
                }else{
                    cb({
                        body : '',
                        response : 404,
                        head : obj.head
                    });
                }
            }
        }else{
            cb({
                body:'',
                response:404,
                responseText:'Not Model Find',
                head:{
                    'Content-Type':'text/plain'
                }
            });
        }
    }else{
        // console.log(this.controlersGET);
        cb({        
            body:'',
            response:404,
            responseText:'Not Controler Find',
            head:{
                'Content-Type':'text/plain'
            }
        });
    }
};


CreateServerHttp.prototype.ExecutePOSTControler = function(Data,cb){
    var _this = this;
    var obj = {
        url : Data.url,
        session:Data.session,
        cookie:Data.cookie,
        request:Data.request,
        response:Data.response,
        controler:Data.controler,
        model:Data.model,
        post : Data.post,
        postenctype : Data.postenctype,
        get : Data.get,
        getenctype : Data.getenctype,
        document:'',
        event : Data.event
    };

    if (this.controlersPOST[Data.controler] ? true : false){
        if(this.controlersPOST[Data.controler][Data.model]){

            if(typeof this.controlersPOST[Data.controler][Data.model].head == 'object'){
                obj.head = this.controlersPOST[Data.controler][Data.model].head;
            }else if(typeof this.controlersPOST[Data.controler][Data.model].head == 'function'){
                obj.head = this.controlersPOST[Data.controler][Data.model].head.call(_this,Data.model);
            } else {
                obj.head = undefined;
            }

            //obj.head = this.controlersPOST[Data.controler][Data.model].head;
            obj.filename = this.controlersPOST[Data.controler][Data.model].includefile;
            if (!this.controlersPOST[Data.controler][Data.model].virtual){
                ReadFile('./'+Data.controler+'/'+Data.model,function(file){
                    obj.file = file;
                    obj.document = {
                        body : obj.file.buff,
                        response : obj.file.response,
                        responseText : obj.file.responseText,
                        head : obj.head
                    }

                    if(_this.controlersPOST[Data.controler][Data.model].model){
                        if (_this.controlersPOST[Data.controler][Data.model].includefile){

                            if (typeof _this.controlersPOST[Data.controler][Data.model].includefile == 'object'){
                                var fileTab = [];
                                var count = _this.controlersPOST[Data.controler][Data.model].includefile.length-1;
                                var i = 0;
                                for(var objx in _this.controlersPOST[Data.controler][Data.model].includefile){
                                    ReadFile(_this.controlersPOST[Data.controler][Data.model].includefile[objx],function(file_){
                                        fileTab.push(file_);

                                        if (i == count){
                                            _this.controlersPOST[Data.controler][Data.model].model.call(obj,cb,fileTab);
                                        }
                                        i++;
                                    });
                                }
                            }else
                            {
                                ReadFile(_this.controlersPOST[Data.controler][Data.model].includefile,function(file_){
                                    _this.controlersPOST[Data.controler][Data.model].model.call(obj,cb,file_);
                                });
                            }
                        }else _this.controlersPOST[Data.controler][Data.model].model.call(obj,cb);
                    }else{
                        cb({
                            body : obj.file.buff,
                            response : obj.file.response,
                            responseText : obj.file.responseText,
                            head : obj.head
                        });
                    }
                });
            }else{
                obj.document = {
                    body : '',
                    response : 404,
                    head : obj.head
                }
                if(_this.controlersPOST[Data.controler][Data.model].model){
                    if (_this.controlersPOST[Data.controler][Data.model].includefile){

                        if (typeof _this.controlersPOST[Data.controler][Data.model].includefile == 'object'){
                            var fileTab = [];
                            var count = _this.controlersPOST[Data.controler][Data.model].includefile.length-1;
                            var i = 0;
                            for(var objx in _this.controlersPOST[Data.controler][Data.model].includefile){
                                ReadFile(_this.controlersPOST[Data.controler][Data.model].includefile[objx],function(file_){
                                    fileTab.push(file_);

                                    if (i == count){
                                        _this.controlersPOST[Data.controler][Data.model].model.call(obj,cb,fileTab);
                                    }
                                    i++;
                                });
                            }
                        }else{
                            ReadFile(_this.controlersPOST[Data.controler][Data.model].includefile,function(file_){
                                _this.controlersPOST[Data.controler][Data.model].model.call(obj,cb,file_);
                            });
                        }
                    }else _this.controlersPOST[Data.controler][Data.model].model.call(obj,cb);
                }else{
                    cb({
                        body : '',
                        response : 404,
                        head : obj.head
                    });
                }
            }
        }else  if(this.controlersPOST[Data.controler]['*']){

            if(typeof this.controlersPOST[Data.controler]['*'].head == 'object'){
                obj.head = this.controlersPOST[Data.controler]['*'].head;
            }else if(typeof this.controlersPOST[Data.controler]['*'].head == 'function'){
                obj.head = this.controlersPOST[Data.controler]['*'].head.call(_this,Data.model);
            } else {
                obj.head = undefined;
            }

            // obj.head = this.controlersPOST[Data.controler]['*'].head;

            if (!_this.controlersPOST[Data.controler]['*'].virtual){
                obj.filename = _this.controlersPOST[Data.controler]['*'].includefile;
                var newFile = Data.model ? Data.model : obj.includefile;
                ReadFile('./'+Data.controler+'/'+newFile,function(file){

                    obj.file = file;
                    obj.document = {
                        body : obj.file.buff,
                        response : obj.file.response,
                        responseText : obj.file.responseText,
                        head : obj.head
                    }
                    if(_this.controlersPOST[Data.controler]['*'].model){
                        if (_this.controlersPOST[Data.controler]['*'].includefile){
                            if (typeof _this.controlersPOST[Data.controler]['*'].includefile == 'object'){
                                var fileTab = [];
                                var count = _this.controlersPOST[Data.controler]['*'].includefile.length-1;
                                var i = 0;
                                for(var objx in _this.controlersPOST[Data.controler]['*'].includefile){
                                    ReadFile(_this.controlersPOST[Data.controler]['*'].includefile[objx],function(file_){
                                        fileTab.push(file_);

                                        if (i == count){
                                            _this.controlersPOST[Data.controler]['*'].model.call(obj,cb,fileTab);
                                        }
                                        i++;
                                    });
                                }
                            }else{
                                ReadFile(_this.controlersPOST[Data.controler]['*'].includefile,function(file_){
                                    _this.controlersPOST[Data.controler]['*'].model.call(obj,cb,file_);
                                });
                            }
                        }else _this.controlersPOST[Data.controler]['*'].model.call(obj,cb);
                    }else{
                        cb({
                            body : obj.file.buff,
                            response : obj.file.response,
                            responseText : obj.file.responseText,
                            head : obj.head
                        });
                    }
                });
            }else{
                obj.document = {
                    body : '',
                    response : 404,
                    head : obj.head
                }
                if(_this.controlersPOST[Data.controler]['*'].model){
                    if (_this.controlersPOST[Data.controler]['*'].includefile){

                        if (typeof _this.controlersPOST[Data.controler]['*'].includefile == 'object'){
                            var fileTab = [];
                            var count = _this.controlersPOST[Data.controler]['*'].includefile.length-1;
                            var i = 0;
                            for(var objx in _this.controlersPOST[Data.controler]['*'].includefile){
                                ReadFile(_this.controlersPOST[Data.controler]['*'].includefile[objx],function(file_){
                                    fileTab.push(file_);

                                    if (i == count){
                                        _this.controlersPOST[Data.controler]['*'].model.call(obj,cb,fileTab);
                                    }
                                    i++;
                                });
                            }
                        }else{
                            ReadFile(_this.controlersPOST[Data.controler]['*'].includefile,function(file_){
                                _this.controlersPOST[Data.controler]['*'].model.call(obj,cb,file_);
                            });
                        }
                    }else _this.controlersPOST[Data.controler]['*'].model.call(obj,cb);
                }else{
                    cb({
                        body : '',
                        response : 404,
                        head : obj.head
                    });
                }
            }
        }else{
            cb({
                body:'',
                response:404,
                responseText:'Not Model Find',
                head:{
                    'Content-Type':'text/plain'
                }
            });
        }
    }else cb({
        body:'',
        response:404,
        responseText:'Not Controler Find',
        head:{
            'Content-Type':'text/plain'
        }
    });
};

//----------------------
module.exports.ServerHttp = CreateServerHttp;
module.exports.urlParse = urlParse;
module.exports.ReadFile = ReadFile;
module.exports.echo = echo;
