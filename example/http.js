var Framework = require("../lib/framework.js");
var $ = new Framework.ServerHttp(9090);

$.SetDefaultHead({
    'html':'text/html',
    'js':'application/javascript',
    'css':'text/css',
    'png':'image/png',
    'gif':'image/gif',
    'jpg':'image/jpeg'
});

$.NewGETControler('html',{
  name:'*'
});

$.NewGETControler('css',{
  name:'*'
});

$.NewGETControler('image',{
  name:'*'
});

$.NewGETControler('javascript',{
  name:'*'
});

$.NewPOSTControler('node',{
  name:'post.js',
  virtual:true,
  fn:function(callback){
    
    console.log(this.post);
    this.document.body = "login:"+this.post["login"]+"; password:"+this.post["password"];
    this.document.response = 200;
    this.document.responseText = "OK";
    callback(this.document)
  }
});

$.listen();
