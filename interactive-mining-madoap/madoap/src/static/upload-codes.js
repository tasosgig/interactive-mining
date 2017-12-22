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
            triggerDataTable();
            var value = $(this).val();
            var newId = generateId();
            addDataToTable(newId, value, "");
            var currentEle = $('#'+ newId).find("td.code");
            editValue(currentEle, value, 0);
        });
    }

    var handleAddRowButton = function() {
        $('#add-row-below').on('focus', function( e ) {
            var newId = generateId();
            addDataToTable(newId, "", "");
            $('#'+ newId).find("td.code").trigger("click");
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
                  $('#file-upload-response').html('<b style=\"color: red\">File Failed to Upload!</b>'+xhr.responseText)
                  // $('#file-uploaded')[0].checked = false;
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
        });
    }

    var tableDataToArray = function() {
        var data = {};
        $("#data-table tbody tr").each(function(i, v){
            // data[i] = Array();
            // $(this).children('td').each(function(ii, vv){
            //     data[i][ii] = $(this).text();
            // });
            if ($(v).find("td.code").text() === '')
              return true;
            data[$(v).find("td.code").text()] = $(v).find("td.acknowl").text();
        })
        return data
    }

    var clickedElement=null;
    var saveEditBox = function(element) {
        codeElement = element.find(".code");
        ackowElement = element.find(".acknowl");
        codeElement2 = element.find(".code .thVal");
        ackowElement2 = element.find(".acknowl .thVal");
        var codeValue2 = codeElement2.val().trim();
        var ackowValue2 = ackowElement2.val().trim();
        $(codeElement).html(codeValue2);
        $(ackowElement).html(ackowValue2);
        if (codeValue2 == "") {
          codeElement.addClass("empty");
        }
        if (ackowValue2 == "") {
          ackowElement.addClass("empty");
        }
    }

    var editValue = function(currentEle, target) {
        clickedElement = currentEle;
        // Locate code ande acknow
        codeElement = currentEle.find(".code");
        ackowElement = currentEle.find(".acknowl");
        // remove empty class if any
        codeElement.removeClass("empty");
        ackowElement.removeClass("empty");
        $(document).off('click');
        // get elements lines number
        var divHeight = ackowElement.outerHeight(true);
        var lineHeight = parseInt(ackowElement.css('line-height'));
        var lines = divHeight / lineHeight;

        var codeValue = codeElement.html();
        input1 = $('<input style="width:100%" class="thVal" type="text" value="" />');
        input1.val(codeValue);
        $(codeElement).html(input1);


        var ackowValue = ackowElement.html();
        input2 = $('<textarea class="uk-textarea thVal" rows="'+lines+'" style="word-break: break-word; width:100%" type="text" value="" />');
        input2.val(ackowValue);
        $(ackowElement).html(input2);


        if (target === "code") {
          $(".code .thVal").focus();
        } else {
          $(".acknowl .thVal").focus();
        }
        $(".thVal").keyup(function (event) {
            // Handle Enter key
            if (event.keyCode == 13) {
              var parent = $(".thVal").parent().parent();
              codeElement2 = parent.find(".code .thVal");
              ackowElement2 = parent.find(".acknowl .thVal");
              var codeValue2 = codeElement2.val().trim();
              var ackowValue2 = ackowElement2.val().trim();
              $(codeElement).html(codeValue2);
              $(ackowElement).html(ackowValue2);
              if (codeValue2 == "") {
                codeElement.addClass("empty");
              }
              if (ackowValue2 == "") {
                ackowElement.addClass("empty");
              }
              clickedElement = null;
            }
            // Handle Esc key
            else if (event.keyCode == 27) {
              $(codeElement).html(codeValue);
              $(ackowElement).html(ackowValue);
              if (codeValue == "") {
                codeElement.addClass("empty");
              }
              if (ackowValue == "") {
                ackowElement.addClass("empty");
              }
              clickedElement = null;
            }
        });
        // Handle clicks outside editboxes
        $(document).click(function (event) {
            if($(event.target).hasClass('thVal')===false) {
              saveEditBox(currentEle);
              $(document).off('click');
              clickedElement = null;
            }
        });
    }

    // a fucntion to catch double click on positive and negative phrases edit boxes
    var addDoubleClick = function(element){
        $(element).click(function (event) {
          console.log($(event.target));
          if($(event.target).hasClass('thVal')===false) {
              event.stopPropagation();
              // save previous clicked box
              if (clickedElement)
                saveEditBox(clickedElement);
              var currentEle = $(this).parent();
              editValue(currentEle, $(event.target).hasClass('code')?"code":$(event.target).hasClass('acknowl')?"acknowl":"code");
          }
        });
    }

    var removeDataRow = function(id){
      var item = $('#' + id );
    
      item.addClass('removed-item')
          .one('webkitAnimationEnd oanimationend msAnimationEnd animationend', function(e) {
              $(this).remove();
              // fix # column numbering
              count_table_rows = 1;
              $("#data-table tbody tr").each(function(i, v){
                // data[i] = Array();
                // $(this).children('td').each(function(ii, vv){
                //     data[i][ii] = $(this).text();
                // });
                $(v).find("td.num").text(count_table_rows);
                count_table_rows++;
              })
              if (count_table_rows === 1) {
                $('#next-button').attr('disabled', 'disabled').addClass('disabled');
              }
           });
    };

    var count_table_rows = 1;

    var addDataToTable = function(id, code, acknowledgment) {
      // <td class="num cm-table-number">'+count_table_rows+'</td>
        var row = '<tr id="' + id + '"><td class="code '+(code===''?'empty':'')+'">' + code + '</td><td class="acknowl '+(acknowledgment===''?'empty':'')+'">' + acknowledgment +'</td></tr>'
        table = $('#data-table tbody');

        // if content is correct and not empty append to table
        $('#data-table tbody').append(row);

        count_table_rows++;
        if (count_table_rows != 1) {
          $("#next-button").removeAttr('disabled').removeClass('disabled');
        }

        // add all the item's extra functionality
        var createdItem = $('#'+ id);
        // delete button
        createdItem.append($('<td />', {"class":"edit"}).append($('<a />', {"class":"uk-icon-link", "uk-icon":"icon: pencil", "contenteditable" : "false"})));
        createdItem.append($('<td />', {"class":"delete"}).append($('<a />', {
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
        addDoubleClick($(createdItem).find("td.edit"));
        createdItem.on('keydown', function(ev){
            if(ev.keyCode === 13) return false;
        });
    }

    var triggerDataTable = function() {
      $("#initial-type-input").remove();
      $("#data-table").show();
    }

    var handleFileUploadButton = function() {
        $("form#codes-file-input-form").on('change', function(){
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
                cache: false,
                contentType: false,
                processData: false,
                success: function (data) {
                    // TODO check for error
                    $('#codes-file-upload-response').html(JSON.parse(data).respond)
                    respond = JSON && JSON.parse(data).respond || $.parseJSON(data).respond;
                    UIkit.notification({
                      message: respond,
                      status: 'success',
                      pos: 'top-center',
                      timeout: 5000
                    });
                    obj = JSON && JSON.parse(data).data || $.parseJSON(data).data;
                    // console.log(obj);
                    for (var key1 in obj) {
                        if (obj.hasOwnProperty(key1)) {
                          addDataToTable(generateId(), key1, obj[key1]);
                        }
                    }
                    triggerDataTable();
                },
                error: function (xhr, ajaxOptions, thrownError) {
                  $('#codes-file-upload-response').html('<b style=\"color: red\">File Failed to Upload!</b>'+xhr.responseText)
                  // $('#file-uploaded')[0].checked = false;
                  UIkit.notification({
                    message: xhr.responseText,
                    status: 'danger',
                    pos: 'top-center',
                    timeout: 0
                  });
                }
            });
            $("#codes-file-input")[0].value = "";

            return false;
        });

        var bar = document.getElementById('js-progressbar');
        UIkit.upload('.js-upload', {
            url: 'upload-codes',
            multiple: false,
            name: 'upload',
            loadStart: function (e) {
                bar.removeAttribute('hidden');
                bar.max = e.total;
                bar.value = e.loaded;
            },
            progress: function (e) {
                bar.max = e.total;
                bar.value = e.loaded;
            },
            loadEnd: function (e) {
                bar.max = e.total;
                bar.value = e.loaded;
            },
            completeAll: function (data) {
                console.log(data.responseText);
                setTimeout(function () {
                    bar.setAttribute('hidden', 'hidden');
                }, 1000);
                $('#codes-file-upload-response').html(JSON.parse(data.responseText).respond)
                respond = JSON && JSON.parse(data.responseText).respond || $.parseJSON(data.responseText).respond;
                obj = JSON && JSON.parse(data.responseText).data || $.parseJSON(data.responseText).data;
                // console.log(obj);
                // clear already inserted data
                $('#data-table tbody').empty();
                count_table_rows = 1;
                // add newly added data
                var dataCounter = 0;
                for (var key1 in obj) {
                    if (obj.hasOwnProperty(key1)) {
                      addDataToTable(generateId(), key1, obj[key1]);
                      dataCounter++;
                    }
                }
                UIkit.notification({
                  message: '<b>'+dataCounter+' Codes</b> loaded successfully!',
                  status: 'success',
                  pos: 'top-center',
                  timeout: 5000
                });
                triggerDataTable();
            },
            error: function (xhr, ajaxOptions, thrownError) {
              $('#codes-file-upload-response').html('<b style=\"color: red\">File Failed to Upload!</b>'+xhr.responseText)
                // $('#file-uploaded')[0].checked = false;
              UIkit.notification({
                message: xhr.responseText,
                status: 'danger',
                pos: 'top-center',
                timeout: 0
              });
            }
        });

    }

    var checkAlreadyUserState = function() {
      var formData = new FormData();
      formData.append("already", "");
      $.ajax({
          url: "upload-codes",
          type: 'POST',
          data: formData,
          async: false,
          success: function (data) {
              obj = JSON && JSON.parse(data).data || $.parseJSON(data).data;
              // console.log(obj);
              var numOfCodes = 0;
              for (var key1 in obj) {
                  if (obj.hasOwnProperty(key1)) {
                    addDataToTable(generateId(), key1, obj[key1]);
                  }
                  numOfCodes++
              }
              if (numOfCodes != 0) {
                triggerDataTable();
              } else {
                localStorage.clear();
              }
          },
          error: function (xhr, ajaxOptions, thrownError) {
            $('#codes-file-upload-response').html('<b style=\"color: red\">File Failed to Upload!</b>'+xhr.responseText)
            // $('#file-uploaded')[0].checked = false;
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
    }

    var init = function(){
        checkAlreadyUserState();
        handleFileUploadButton();
        onUserStartTyping();
        handleAddRowButton();
        handleNextButton();
    };

    //start all
    init();

})();
