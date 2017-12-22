(function(){

    function getCookie(name) {
        var value = "; " + document.cookie;
        var parts = value.split("; " + name + "=");
        if (parts.length == 2) return parts.pop().split(";").shift();
    }

    ////////// UPLOAD FUNCTIONS

    $( '.inputfile' ).each( function() {
        var $input   = $( this ),
          $label   = $input.next( 'label' ),
          labelVal = $label.html();

        $input.on( 'change', function( e )
        {
          var fileName = '';

          if( this.files && this.files.length > 1 )
            fileName = ( this.getAttribute( 'data-multiple-caption' ) || '' ).replace( '{count}', this.files.length );
          else if( e.target.value )
            fileName = e.target.value.split( '\\' ).pop();

          if( fileName )
            $label.find( 'span' ).html( fileName );
          else
            $label.html( labelVal );
        });

        // Firefox bug fix
        $input
        .on( 'focus', function(){ $input.addClass( 'has-focus' ); })
        .on( 'blur', function(){ $input.removeClass( 'has-focus' ); });
    });

    //generates a unique id
    var generateId = function(is_pos){
        if (is_pos) {
            return "positive-" + +new Date() + Math.random().toFixed(5).substring(2);
        } else {
            return "negative-" + +new Date() + Math.random().toFixed(5).substring(2);
        }
    }

    var handleFileUploadButton = function() {
        $("form#profile-input-form").on('change', function(){
            if ($('#profile-file-input')[0].value === "") {
              window.alert("You must specify a data file to import.");
              return false;
            }
            var formData = new FormData($(this)[0]);
            $.ajax({
                url: "/",
                type: 'POST',
                data: formData,
                async: false,
                success: function (data) {
                    obj = JSON && JSON.parse(data) || $.parseJSON(data);
                    console.log(obj);
                    // reset localStorage and store the uploaded profiles data
                    localStorage.clear();
                    // set poswords
                    var poswords = [];
                    if (obj.hasOwnProperty("poswords")) {
                        poswords = obj["poswords"];
                        for (var word in poswords) {
                          var obj2 = {};
                          obj2["phrase"] = word;
                          obj2["weight"] = poswords[word];
                          localStorage.setItem(generateId(1), JSON.stringify(obj2));
                        }
                    }
                    // set poswords
                    var negwords = [];
                    if (obj.hasOwnProperty("negwords")) {
                        negwords = obj["negwords"];
                        for (var word in negwords) {
                          var obj2 = {};
                          obj2["phrase"] = word;
                          obj2["weight"] = negwords[word];
                          localStorage.setItem(generateId(0), JSON.stringify(obj2));
                        }
                    }
                    if (obj.hasOwnProperty("contextprev")) {
                      localStorage.setItem("contextprev", String(obj["contextprev"]));
                    }
                    if (obj.hasOwnProperty("contextmiddle")) {
                      localStorage.setItem("contextmiddle", String(obj["contextmiddle"]));
                    }
                    if (obj.hasOwnProperty("contextnext")) {
                      localStorage.setItem("contextnext", String(obj["contextnext"]));
                    }
                    if (obj.hasOwnProperty("lettercase")) {
                      localStorage.setItem("lettercase", String(obj["lettercase"]));
                    }
                    if (obj.hasOwnProperty("wordssplitnum")) {
                      localStorage.setItem("wordssplitnum", String(obj["wordssplitnum"]));
                    }
                    if (obj.hasOwnProperty("stopwords")) {
                      localStorage.setItem("stopwords", String(obj["stopwords"]));
                    }
                    if (obj.hasOwnProperty("punctuation")) {
                      localStorage.setItem("punctuation", String(obj["punctuation"]));
                    }
                    // set easy mode option to custom
                    localStorage.setItem("matchlevel", "#c-level");
                    window.location="upload-codes";
                },
                error: function (xhr, ajaxOptions, thrownError) {
                  UIkit.notification({
                    message: xhr.responseText,
                    status: 'danger',
                    pos: 'top-center',
                    timeout: 0
                  });
                },
                cache: false,
                contentType: false,
                processData: false
            });
            $("#profile-file-input")[0].value = "";

            return false;
        });
    }

    var handleExampleLoadButton = function() {
      $("#example-load-btn").on('click', function(){
            var formData = new FormData();
            formData.append("example", "1");
            $.ajax({
                url: "/",
                type: 'POST',
                data: formData,
                async: false,
                success: function (data) {
                    obj = JSON && JSON.parse(data) || $.parseJSON(data);
                    console.log(obj);
                    // reset localStorage and store the uploaded profiles data
                    localStorage.clear();
                    // set poswords
                    var poswords = [];
                    if (obj.hasOwnProperty("poswords")) {
                        poswords = obj["poswords"];
                        for (var word in poswords) {
                          var obj2 = {};
                          obj2["phrase"] = word;
                          obj2["weight"] = poswords[word];
                          localStorage.setItem(generateId(1), JSON.stringify(obj2));
                        }
                    }
                    // set poswords
                    var negwords = [];
                    if (obj.hasOwnProperty("negwords")) {
                        negwords = obj["negwords"];
                        for (var word in negwords) {
                          var obj2 = {};
                          obj2["phrase"] = word;
                          obj2["weight"] = negwords[word];
                          localStorage.setItem(generateId(0), JSON.stringify(obj2));
                        }
                    }
                    if (obj.hasOwnProperty("contextprev")) {
                      localStorage.setItem("contextprev", String(obj["contextprev"]));
                    }
                    if (obj.hasOwnProperty("contextmiddle")) {
                      localStorage.setItem("contextmiddle", String(obj["contextmiddle"]));
                    }
                    if (obj.hasOwnProperty("contextnext")) {
                      localStorage.setItem("contextnext", String(obj["contextnext"]));
                    }
                    if (obj.hasOwnProperty("lettercase")) {
                      localStorage.setItem("lettercase", String(obj["lettercase"]));
                    }
                    if (obj.hasOwnProperty("wordssplitnum")) {
                      localStorage.setItem("wordssplitnum", String(obj["wordssplitnum"]));
                    }
                    if (obj.hasOwnProperty("stopwords")) {
                      localStorage.setItem("stopwords", String(obj["stopwords"]));
                    }
                    if (obj.hasOwnProperty("punctuation")) {
                      localStorage.setItem("punctuation", String(obj["punctuation"]));
                    }
                    // set easy mode option to custom
                    localStorage.setItem("matchlevel", "#c-level");
                    window.location="upload-codes";
                },
                error: function (xhr, ajaxOptions, thrownError) {
                  UIkit.notification({
                    message: xhr.responseText,
                    status: 'danger',
                    pos: 'top-center',
                    timeout: 0
                  });
                },
                cache: false,
                contentType: false,
                processData: false
            });

            return false;
      });
    }


    var init = function(){
      handleFileUploadButton();
      handleExampleLoadButton();
    };

    //start all
    init();

})();
