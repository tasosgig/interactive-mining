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
    var generateId = function(){
        return "row-" + +new Date() + Math.random().toFixed(5).substring(2);
    }

    var onUserStartTyping = function() {
        $("#initial-type-input").on( 'keypress', function( e ){
            $(this).css('display', 'none');
            var value = $(this).val();
            var newId = generateId();
            addDataToTable(newId, value, "");
            var currentEle = $('#'+ newId).find("td.code");
            editValue(currentEle, value, 0);
        });
    }

    var handleAddRowButton = function() {
        $('#add-row-below').on('click', function( e ) {
            addDataToTable(generateId(), "", "");
        });
    }

    var handleNextButton = function() {
        $('#next-button').on('click', function( e ) {
            console.log(JSON.stringify(tableDataToArray()));
            var formData = new FormData();
            formData.append("concepts", JSON.stringify(tableDataToArray()));
            $.ajax({
                url: "upload-codes",
                type: 'POST',
                data: formData,
                async: false,
                success: function (data) {
                    console.log(JSON.parse(data).respond)
                    window.location="configure-profile"
                },
                error: function (xhr, ajaxOptions, thrownError) {
                  $('#file-upload-response').html('<b style=\"color: red\">File Failed to Upload!</b>'+xhr.status)
                  // $('#file-uploaded')[0].checked = false;
                },
                cache: false,
                contentType: false,
                processData: false
            });
        });
    }

    var tableDataToArray = function() {
        var data = {};
        $("#data-table tbody tr").each(function(i, v){
            // data[i] = Array();
            // $(this).children('td').each(function(ii, vv){
            //     data[i][ii] = $(this).text();
            // });
            data[$(v).find("td.code").text()] = $(v).find("td.acknowl").text();
        })
        return data
    }

    var clickedElement=null;
    var saveEditBox = function(element) {
        var new_val = $(".thVal").val();
        $(element).html($(".thVal").val().trim());
    }

    var editValue = function(currentEle, value, isArea) {
        clickedElement = currentEle;
        $(document).off('click');
        if (isArea) {
            $(currentEle).html('<input class="uk-textarea thVal" style="word-break: break-word; width:100%" type="text" value="' + value + '" />');
        } else {
            $(currentEle).html('<input style="width:100%" class="thVal" type="text" value="' + value + '" />');
        }
        $(".thVal").focus();
        $(".thVal").keyup(function (event) {
            // Handle Enter key
            if (event.keyCode == 13) {
              var new_val = $(".thVal").val();
              $(currentEle).html($(".thVal").val().trim());
              clickedElement = null;
            }
            // Handle Esc key
            else if (event.keyCode == 27) {
              $(currentEle).html(value);
              clickedElement = null;
            }
        });
        // Handle clicks outside editboxes
        $(document).click(function (event) {
            if($(event.target).attr('class')!="thVal") {
              saveEditBox(currentEle);
              $(document).off('click');
              clickedElement = null;
            }
        });
    }

    // a fucntion to catch double click on positive and negative phrases edit boxes
    var addDoubleClick = function(element){
        $(element).click(function (event) {
          if($(event.target).attr('class')!="thVal") {
              event.stopPropagation();
              // save previous clicked box
              if (clickedElement)
                saveEditBox(clickedElement);
              var currentEle = $(this);
              var value = $(this).html();
              editValue(currentEle, value, currentEle.hasClass("acknowl")?1:0);
          }
        });
    }

    var removeDataRow = function(id){
      var item = $('#' + id );
      
      item.addClass('removed-item')
          .one('webkitAnimationEnd oanimationend msAnimationEnd animationend', function(e) {
              $(this).remove();
           });
    };

    var count_table_rows = 1;

    var addDataToTable = function(id, code, acknowledgment) {
        var row = '<tr id="' + id + '"><td>'+count_table_rows+'</td><td class="code">' + code + '</td><td class="acknowl">' + acknowledgment +'</td></tr>'
        table = $('#data-table tbody');

        // if content is correct and not empty append to table
        $('#data-table tbody').append(row);

        count_table_rows++;

        // add all the item's extra functionality
        var createdItem = $('#'+ id);
        // delete button
        createdItem.append($('<td />').append($('<a />', {
                               "class" :"uk-icon-link",
                               "uk-icon" : "icon: trash",
                               "contenteditable" : "false",
                               click: function(){
                                        var confirmation = confirm('Delete this word?');
                                        if(confirmation) {
                                           removeDataRow(id);
                                         }
                                      }
                  })));
        addDoubleClick($(createdItem).find("td.code"));
        addDoubleClick($(createdItem).find("td.acknowl"));
        createdItem.on('keydown', function(ev){
            if(ev.keyCode === 13) return false;
        });
    }

    var handleFileUploadButton = function() {
        $("form#codes-file-input-form").submit(function(){
            if ($('#codes-file-input')[0].value === "") {
              window.alert("You must specify a data file to import.");
              return false;
            }
            var formData = new FormData($(this)[0]);
            $.ajax({
                url: "upload-codes",
                type: 'POST',
                data: formData,
                async: false,
                success: function (data) {
                    // TODO check for error
                    $('#codes-file-upload-response').html(JSON.parse(data).respond)
                    obj = JSON && JSON.parse(data).data || $.parseJSON(data).data;
                    // console.log(obj);
                    for (var key1 in obj) {
                        if (obj.hasOwnProperty(key1)) {
                          addDataToTable(generateId(), key1, obj[key1]);
                        }
                    }
                },
                error: function (xhr, ajaxOptions, thrownError) {
                  $('#codes-file-upload-response').html('<b style=\"color: red\">File Failed to Upload!</b>'+xhr.status)
                  // $('#file-uploaded')[0].checked = false;
                },
                cache: false,
                contentType: false,
                processData: false
            });

            return false;
        });
    }

    var init = function(){
        localStorage.clear();
        handleFileUploadButton();
        onUserStartTyping();
        handleAddRowButton();
        handleNextButton();
    };

    //start all
    init();

})();
