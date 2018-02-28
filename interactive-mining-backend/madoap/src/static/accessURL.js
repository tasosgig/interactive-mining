function accessURL(url, params, method, postCompletionCallback, visname) {

    var xhr=null;

    if (typeof XMLHttpRequest == "undefined")
      XMLHttpRequest = function () {
        try { return new ActiveXObject("Msxml2.XMLHTTP.6.0"); }
          catch (e) {}
        try { return new ActiveXObject("Msxml2.XMLHTTP.3.0"); }
          catch (e) {}
        try { return new ActiveXObject("Microsoft.XMLHTTP"); }
          catch (e) {}
        throw new Error("This browser does not support XMLHttpRequest.");
      };

    xhr = new XMLHttpRequest();

    xhr.onreadystatechange  = function()
    {
        try{
     //       if((xhr.readyState  == 3) || (xhr.readyState  == 4)){
//                alert("Resp text: "+xhr.responseText + "<br></br>Resp XML: "+xhr.responseXML +"<br></br>Status: "+ xhr.status +"<br></br>status Text: "+ xhr.statusText);
           
    //        }
            if(xhr.readyState  == 4)
            {

                if(xhr.status  == 200) {

                    //   document.ajax.dyn="Received:"  + xhr.responseText; 
                    var outcome=xhr.responseText;
//                    alert(xhr.responseText);
                    postCompletionCallback(outcome, visname);
                }
                else {
                    //alert("Error code " + xhr.status);
                    outcome="Error: "+xhr.responseText;
                    postCompletionCallback(outcome, visname);
                }
            } else {
        //        alert("state is:"+xhr.readyState+" status is"+xhr.status+ "response text is: "+xhr.responseText);
              //  alert("ready False");
            }

        }catch(e) {
        }
    };
    if (method=="POST"){
        xhr.open("POST",  url,  true);
        xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xhr.setRequestHeader("Content-length", params.length);
        xhr.send(params);
    }
    else {

        if (params.length>0){
            url+='?'+params;
        }
    xhr.open("GET",  url,  true);
    xhr.send(null);
    }
}
