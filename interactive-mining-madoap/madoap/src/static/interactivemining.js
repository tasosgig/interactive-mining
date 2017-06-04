function handleLoadExampleFile() {
    $("#file-input-operation").val('example');
    $("#file-title-text").html('');
    $('#file-input').val('');
    var formData = new FormData($("form#file-input-form")[0]);
    $.ajax({
        url: "importing-controller",
        type: 'POST',
        data: formData,
        async: false,
        success: function (data) {
            $('#file-upload-response').html(JSON.parse(data).respond)
            // if (data.indexOf('successfully!') != -1) {
            //   $('#file-uploaded')[0].checked = true;
            // }
        },
        error: function (xhr, ajaxOptions, thrownError) {
          $('#file-upload-response').html('<b style=\"color: red\">File Failed to Upload!</b>'+xhr.status)
          // $('#file-uploaded')[0].checked = false;
        },
        cache: false,
        contentType: false,
        processData: false
    });
}

$( window ).resize(function() {
  $("#file-input-label").width($(".file-upload-wrapper").width() - 250 +"px");
});

(function(){

  function getCookie(name) {
    var value = "; " + document.cookie;
    var parts = value.split("; " + name + "=");
    if (parts.length == 2) return parts.pop().split(";").shift();
  }

////////// UPLOAD FUNCTIONS

  $( '.inputfile' ).each( function()
  {
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

  function handleFileUploadButton() {
        $("form#file-input-form").submit(function(){
            if ($('#file-input')[0].value === "") {
              window.alert("You must specify a data file to import.");
              return false;
            }
            // $('#user-id').val(getCookie("madgikmining"));
            $("#file-input-operation").val('normal');
            var formData = new FormData($(this)[0]);
            $.ajax({
                url: "importing-controller",
                type: 'POST',
                data: formData,
                async: false,
                success: function (data) {
                    $('#file-upload-response').html(JSON.parse(data).respond)
                    // if (data.indexOf('successfully!') != -1) {
                    //   $('#file-uploaded')[0].checked = true;
                    // }
                },
                error: function (xhr, ajaxOptions, thrownError) {
                  $('#file-upload-response').html('<b style=\"color: red\">File Failed to Upload!</b>'+xhr.status)
                  // $('#file-uploaded')[0].checked = false;
                },
                cache: false,
                contentType: false,
                processData: false
            });

            return false;
        });
  }

  function handleZipFileUploadButton() {
        $("form#zip-file-input-form").submit(function(){
            if ($('#zip-file-input')[0].value === "") {
              window.alert("You must specify a data file to import.");
              return false;
            }
            // $('#user-id').val(getCookie("madgikmining"));
            var formData = new FormData($(this)[0]);
            $.ajax({
                url: "importing-text-controller",
                type: 'POST',
                data: formData,
                async: false,
                success: function (data) {
                    $('#zip-file-upload-response').html(JSON.parse(data).respond)
                    if (data.indexOf('successfully!') != -1) {
                      $('#docs-file-uploaded')[0].checked = true;
                    }
                },
                error: function (xhr, ajaxOptions, thrownError) {
                  $('#zip-file-upload-response').html('<b style=\"color: red\">File Failed to Upload!</b>'+xhr.status);
                  $('#docs-file-uploaded')[0].checked = false;
                },
                cache: false,
                contentType: false,
                processData: false
            });

            return false;
        });
  }

  function handleDocsUploadSelect() {
     $('select#textUploadSelect').change(function(){
          $('#docs-file-uploaded')[0].checked = false;
          if($(this).val()=="1") {
            $('#docUploadText').show();
            $('#docUploadText').children(".title").html("Choose <b>.PDF document</b> file to upload");
            $('#docPasteExample').css('display', 'none');
            $('#docPasteText').html("");
          }
          else if ($(this).val()=="2") {
            $('#docUploadText').show();
            $('#docUploadText').children(".title").html("Choose <b>.TXT document with JSON format</b> file to upload");
            $('#docPasteExample').css('display', 'none');
            $('#docPasteText').html("");
          }
          else {
            $('#docUploadText').css('display', 'none');
            $('#docPasteExample').css('display', 'inline');
            $('#docPasteText').html('<textarea id="docText" class="textarea" onblur="this.placeholder = \'Paste your citations here, separated by newline\'" onfocus="this.placeholder = \'\'" name="document" rows="20"></textarea>');
          }
      });
  }


/////////// LIST FUNCTIONS

  var count_pos = 0, count_neg = 0;

  function updatetextereas(){
    // Create the positive and negative words input to send to the server with json format
    $('#pos-words-text').html('');
    $('#neg-words-text').html('');
    pos_words_list = {};
    neg_words_list = {};
    for(var key in localStorage){
      if (key === null)
        continue;
      var json_string = localStorage.getItem(key);
      data = JSON.parse(json_string);
      if(key.indexOf('positive') === 0){
        pos_words_list[data.text] = data.weight;
      } else if(key.indexOf('negative') === 0) {
        neg_words_list[data.text] = data.weight;
      }
    }
    $('#pos-words-text').html(JSON.stringify(pos_words_list));
    $('#neg-words-text').html(JSON.stringify(neg_words_list));
  }

  function updateCounter(is_pos){
    if (is_pos === 1) {
      $('#count-pos').text(count_pos);
      var deleteButton = $('#clear-all-pos');
      if(count_pos === 0){
        deleteButton.attr('disabled', 'disabled').addClass('disabled');
      }
      else{
        deleteButton.removeAttr('disabled').removeClass('disabled');
      }
    } else {
      $('#count-neg').text(count_neg);
      var deleteButton = $('#clear-all-neg');
      if(count_neg === 0){
        deleteButton.attr('disabled', 'disabled').addClass('disabled');
      }
      else{
        deleteButton.removeAttr('disabled').removeClass('disabled');
      }
    }
  }
  //generates a unique id
  function generateId(is_pos){
    if (is_pos) {
     return "positive-" + +new Date();
    } else {
     return "negative-" + +new Date();
    }
  }
  //saves a text-weight pair in json format to localStorage
  var saveWord = function(id, content_word, content_weight){
    var obj = {};
    obj["text"] = content_word;
    obj["weight"] = content_weight;
    localStorage.setItem(id, JSON.stringify(obj));
  };

  // var editWord = function(is_pos, id){
  //    var $this = $('#' + id);
  //    $this.focus()
  //         .append($('<button />', {
  //           "class": "btn icon-save save-button", 
  //            click: function(){
  //              $this.attr('contenteditable', 'false');
  //              var newcontent = $this.text(), saved = $('.save-notification');
  //              if(!newcontent) {
  //                  var confirmation = confirm('Delete this item?');
  //                  if(confirmation) {
  //                     removeWord(id);
  //                  }
  //              }
  //              else{
  //                   localStorage.setItem(id, newcontent);
  //                   saved.show();
  //                   setTimeout(function(){
  //                      saved.hide();
  //                   },2000);
  //                   $(this).remove();
  //                   $('.icon-pencil').show();
  //              }
  //           }
  //         }));
  //  };

    var clickedElement=null;
    var saveEditBox = function(element) {
      var new_val = $(".thVal").val();
      if (element.hasClass("phrase") || (new_val != '' && !isNaN(new_val) && new_val >= 0 && new_val <= 100)) {
        $(element).html($(".thVal").val().trim());
      } else {
        $(element).html(1);
      }
      updatetextereas();
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
              editValue(currentEle, value, currentEle.hasClass("phrase")?1:0);
          }
        });
    }

   var editValue = function(currentEle, value, isPhrase) {
      clickedElement = currentEle;
      $(document).off('click');
      if (isPhrase) {
        $(currentEle).html('<input style="width:100%" class="thVal" type="text" value="' + value + '" />');
      } else {
        $(currentEle).html('<input style="width:100%" class="thVal" type="number" min="0" max="100" value="' + value + '" />');
      }
      $(".thVal").focus();
      $(".thVal").keyup(function (event) {
        // Handle Enter key
        if (event.keyCode == 13) {
          var new_val = $(".thVal").val();
          if (isPhrase || (new_val != '' && !isNaN(new_val) && new_val >= 0 && new_val <= 100)) {
            $(currentEle).html($(".thVal").val().trim());
          } else {
            $(currentEle).html(1);
          }
          updatetextereas();
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
  
   //removes item from localStorage
   var deleteWord = function(is_pos, id){
     localStorage.removeItem(id);
     if (is_pos === 1) {
        count_pos--;
     } else {
        count_neg--;
     }
     updateCounter(is_pos);
     updatetextereas();
   };

   var removeWord = function(is_pos, id){
      var item = $('#' + id );
      
      item.addClass('removed-item')
          .one('webkitAnimationEnd oanimationend msAnimationEnd animationend', function(e) {
              $(this).remove();
           });

      deleteWord(is_pos, id);
    };
   
    var createWord = function(is_pos, id, content_word, content_weight){
      // create added line with content
      var word = '<li id="' + id + '"><div class="phrase">' + content_word + '</div><div class="weight">' + content_weight +'</div></li>'
      // Choose List to add word (positive or negative)
      var list
      if (is_pos === 1) {
          list = $('#word-pos li');
      } else {
          list = $('#word-neg li');
      }

      // if content is correct and not empty append to list
      if(!$('#'+ id).length){
        word = $(word).addClass('new-item');
        if (is_pos === 1) {
          $('#word-pos').append(word);
        } else {
          $('#word-neg').append(word);
        }

        // add all the item's extra functionality
        var createdItem = $('#'+ id);
        // delete button
        createdItem.append($('<button />', {
                               "class" :"btn icon-trash delete-button",
                               "contenteditable" : "false",
                               click: function(){
                                        var confirmation = confirm('Delete this word?');
                                        if(confirmation) {
                                           removeWord(is_pos, id);
                                         }
                                      }
                  }));
        addDoubleClick($(createdItem).find("div.phrase"))
        addDoubleClick($(createdItem).find("div.weight"))
        // // edit button
        // createdItem.append($('<button />', {
        //                       "class" :"btn icon-pencil edit-button",
        //                       "contenteditable" : "false",
        //                       click: function(){
        //                               createdItem.attr('contenteditable', 'true');
        //                               editWord(is_pos, id);
        //                               $(this).hide();
        //                       } 
        //          }));
        createdItem.on('keydown', function(ev){
            if(ev.keyCode === 13) return false;
        });

        // save word to clients local storage
        saveWord(id, content_word, content_weight);
        if (is_pos === 1) {
          count_pos++;
          updateCounter(1);
        } else {
          count_neg++;
          updateCounter(0);
        }
        updatetextereas();
      }
    };
    //handler for input
    var handleInput = function(){
          $('#word-form-pos').on('submit', function(event){
              event.preventDefault();
              var input_word = $('#text-pos');
              word = input_word.val();
              var input_weight = $('#weight-pos');
              weight = input_weight.val();
              if (word && weight){
                  var id = generateId(1);
                  createWord(1, id, word, weight);
                  input_word.val('');
                  input_weight.val('1');
              }
          });
          $('#word-form-neg').on('submit', function(event){
              event.preventDefault();
              var input_word = $('#text-neg');
              word = input_word.val();
              var input_weight = $('#weight-neg');
              weight = input_weight.val();
              if (word && weight){
                  var id = generateId(0);
                  createWord(0, id, word, weight);
                  input_word.val('');
                  input_weight.val('1');
              }
          });
     };

     var loadDefaultWords = function(){
        localStorage.clear();
        // Add some positive words
        createWord(1, generateId(1), 'European Commission', 1);
        createWord(1, generateId(1), 'FP7', 1);
        createWord(1, generateId(1), 'grants', 1);
        // Add some negative words
        createWord(0, generateId(0), 'FP6', 1);
        createWord(0, generateId(0), 'NIH', 1);
        createWord(0, generateId(0), 'NSF', 1);
        createWord(0, generateId(0), 'Wellcome Trust', 1);
        createWord(0, generateId(0), 'po box', 1);
     };

     // var loadWords = function(){
     //   if(localStorage.length!==0){
     //     for(var key in localStorage){
     //       var text = localStorage.getItem(key);
     //       if(key.indexOf('positive') === 0){
     //          createWord(1, key, text);
     //       } else if(key.indexOf('negative') === 0) {
     //          createWord(0, key, text);
     //       }
     //     }
     //   }
     // };
  //handler for the "delete all" button
     var handleDeleteButton = function(){
          $('#clear-all-pos').on('click', function(){
            if(confirm('Are you sure you want to delete all the items in the list? There is no turning back after that.')){                 //remove items from DOM
              var items = $('li[id ^= positive]');
              items.addClass('removed-item').one('webkitAnimationEnd oanimationend msAnimationEnd animationend', function(e) {
                $(this).remove();
             });

              //look for items in localStorage that start with word- and remove them
              var keys = [];
              for(var key in localStorage){
                 if(key.indexOf('positive') === 0){
                   localStorage.removeItem(key);
                 }
              }
              count_pos = 0;
              updateCounter(1);
            }
            updatetextereas();
          });
          $('#clear-all-neg').on('click', function(){
            if(confirm('Are you sure you want to delete all the items in the list? There is no turning back after that.')){                 //remove items from DOM
              var items = $('li[id ^= negative]');
              items.addClass('removed-item').one('webkitAnimationEnd oanimationend msAnimationEnd animationend', function(e) {
                $(this).remove();
             });

              //look for items in localStorage that start with word- and remove them
              var keys = [];
              for(var key in localStorage){
                 if(key.indexOf('negative') === 0){
                   localStorage.removeItem(key);
                 }
              }
              count_neg = 0;
              updateCounter(0);
            }
            updatetextereas();
          });
      };
  
    var init = function(){
           //$('#text').focus();
           //loadWords();
           loadDefaultWords();
           handleDeleteButton();
           handleInput();
           updateCounter(1);
           updateCounter(0);
           updatetextereas();
           handleFileUploadButton();
           handleZipFileUploadButton();
           handleDocsUploadSelect();
    };
  //start all
  init();

})();


