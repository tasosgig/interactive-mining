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

    var match_level_choice = 0;
    var advanced_options_open = 0;

    var handleMatchLevelChoice = function() {
        $('#1-level').on('click', function( e ) {
            if (advanced_options_open) {
                UIkit.accordion($('.uk-accordion')).toggle(0, true);
                advanced_options_open = 0;
            }
            if (match_level_choice != 0) {
                console.log('#1-level');
            }
            match_level_choice = 0;
        });
        $('#2-level').on('click', function( e ) {
            if (advanced_options_open) {
                UIkit.accordion($('.uk-accordion')).toggle(0, true);
                advanced_options_open = 0;
            }
            if (match_level_choice != 1) {
                console.log('#2-level');
            }
            match_level_choice = 1;
        });
        $('#3-level').on('click', function( e ) {
            if (advanced_options_open) {
                UIkit.accordion($('.uk-accordion')).toggle(0, true);
                advanced_options_open = 0;
            }
            if (match_level_choice != 2) {
                console.log('#3-level');
            }
            match_level_choice = 2;
        });
        $('#c-level').on('click', function( e ) {
            if (advanced_options_open == 0) {
                UIkit.accordion($('.uk-accordion')).toggle(0, true);
                advanced_options_open = 1;
            }
            if (match_level_choice != 3) {
                console.log('#c-level');
            }
        });
        $('.uk-accordion').on('show', function () {
            console.log('#GG-level');
            UIkit.switcher($('#uk-switcher')).show(3);
            UIkit.switcher($('.uk-switcher')).show(3);
            advanced_options_open = 1;
        });
        $('.uk-accordion').on('hide', function () {
            console.log('#BB-level');
            UIkit.switcher($('#uk-switcher')).show(match_level_choice);
            UIkit.switcher($('.uk-switcher')).show(match_level_choice);
            advanced_options_open = 0;
        });

        // UIkit.accordion($('.uk-accordion')).toggle(0, true);
        // UIkit.switcher($('#uk-switcher')).show(3);
        // UIkit.switcher($('.uk-switcher')).show(3);
    }

    var count_pos = 0, count_neg = 0;

    var updateCounter = function(is_pos){
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
    var generateId = function(is_pos){
        if (is_pos) {
            return "positive-" + +new Date() + Math.random().toFixed(5).substring(2);
        } else {
            return "negative-" + +new Date() + Math.random().toFixed(5).substring(2);
        }
    }

    var handleNextButton = function() {
        $('#next-button').on('click', function( e ) {
            console.log(JSON.stringify(wordsDataToArray()));
            var formData = new FormData();
            formData.append("concepts", JSON.stringify(wordsDataToArray()));
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

    var wordsDataToArray = function(is_pos) {
        // TODO
        var data = {};
        if (is_pos === 1) {
            $("#word-pos tbody tr").each(function(i, v){
                // data[i] = Array();
                // $(this).children('td').each(function(ii, vv){
                //     data[i][ii] = $(this).text();
                // });
                data[$(v).find("td.phrase").text()] = $(v).find("td.weight").text();
            })
        } else {
            $("#word-neg tbody tr").each(function(i, v){
                // data[i] = Array();
                // $(this).children('td').each(function(ii, vv){
                //     data[i][ii] = $(this).text();
                // });
                data[$(v).find("td.phrase").text()] = $(v).find("td.weight").text();
            })
        }
        
        return data
    }

    var clickedElement=null;
    var saveEditBox = function(element) {
        var new_val = $(".thVal").val();
        if (element.hasClass("phrase") || (new_val != '' && !isNaN(new_val) && new_val >= 0 && new_val <= 100)) {
            $(element).html($(".thVal").val().trim());
        } else {
            $(element).html(1);
        }
    }

    var editValue = function(currentEle, value, isPhrase) {
        clickedElement = currentEle;
        $(document).off('click');
        if (isPhrase) {
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
                if (isPhrase || (new_val != '' && !isNaN(new_val) && new_val >= 0 && new_val <= 100)) {
                    $(currentEle).html($(".thVal").val().trim());
                } else {
                    $(currentEle).html(1);
                }
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
              editValue(currentEle, value, currentEle.hasClass("phrase")?1:0);
          }
        });
    }

    var removeWord = function(id, is_pos){
        var item = $('#' + id );

        item.addClass('removed-item')
          .one('webkitAnimationEnd oanimationend msAnimationEnd animationend', function(e) {
              $(this).remove();
        });
        if (is_pos === 1) {
            count_pos--;
        } else {
            count_neg--;
        }
    };

    var count_pos = 0, count_neg = 0;

    var addDataToTable = function(id, content_word, content_weight, is_pos) {
        var row = '<tr id="' + id + '"><td class="phrase">' + content_word + '</td><td class="weight">' + content_weight +'</td></tr>'
        table = $('#data-table tbody');

        // if content is correct and not empty append to table
        if(!$('#'+ id).length){

            row = $(row).addClass('new-item');
            if (is_pos === 1) {
                $('#word-pos tbody').append(row);
            } else {
                $('#word-neg tbody').append(row);
            }

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
                                               removeWord(id, is_pos);
                                             }
                                          }
                      })));
            addDoubleClick($(createdItem).find("div.phrase"));
            addDoubleClick($(createdItem).find("div.weight"));
            createdItem.on('keydown', function(ev){
                if(ev.keyCode === 13) return false;
            });
            if (is_pos === 1) {
              count_pos++;
              updateCounter(1);
            } else {
              count_neg++;
              updateCounter(0);
            }
        }
    }

    var handleWordsInput = function(){
        $('#word-form-pos').on('submit', function(event){
            event.preventDefault();
            var input_word = $('#text-pos');
            word = input_word.val();
            var input_weight = $('#weight-pos');
            weight = input_weight.val();
            if (word && weight){
                var id = generateId(1);
                addDataToTable(id, word, weight, 1);
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
                addDataToTable(id, word, weight, 0);
                input_word.val('');
                input_weight.val('1');
            }
        });
     };

    var handleRunMiningButton = function() {
        $("#run-mining-btn").on('click', function( e ) {
            var formData = new FormData();
            formData.append("poswords", JSON.stringify(wordsDataToArray(1)));
            formData.append("negwords", JSON.stringify(wordsDataToArray(0)));
            formData.append("lettercase", $("#letter-case-select option:selected").text());
            formData.append("wordssplitnum", $("#word-split").val());
            formData.append("stopwords", $('#stop-words-filter').prop('checked')===true?1:0);
            formData.append("punctuation", $('#punctuation-filter').prop('checked')===true?1:0);
            filters_list = {};
            filters_list["lettercase"] = $("#letter-case-select option:selected").text();
            filters_list["wordssplitnum"] = $("#word-split").val();
            filters_list["stopwords"] = $('#stop-words-filter').prop('checked')===true?1:0;
            filters_list["punctuation"] = $('#punctuation-filter').prop('checked')===true?1:0;
            formData.append("filters", JSON.stringify(filters_list));
            $.ajax({
                url: "configure-profile",
                type: 'POST',
                data: formData,
                async: false,
                success: function (data) {
                    console.log(data)
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

    var docsUploaded = function(docsNumber) {
        $("#docs-number").html(docsNumber+" documents uploaded");
        $("#docs-more-btn").show();
        $("#run-mining-btn").removeAttr("disabled");
        handleRunMiningButton();
    }

    var handleFileUploadInput = function() {
        $("#docs-file-input").on('change', function() {
            if ($('#docs-file-input')[0].value === "") {
              window.alert("You must specify a data file to upload.");
              return false;
            }
            // var formData = new FormData();
            // formData.append("upload", $('#docs-file-input'));
            var formData = new FormData($('#docs-input-form')[0]);
            $.ajax({
                url: "configure-profile",
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
                    hideInitialDocsUploadForm();
                    docsUploaded(12);
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

    var handleDocSampleChoice = function(btnIndex) {
        var formData = new FormData();
        if (btnIndex === 0) {
            formData.append("doc_sample", "nih_sample");
        } else if (btnIndex === 1) {
            formData.append("doc_sample", "rcuk_sample");
        } else if (btnIndex === 2) {
            formData.append("doc_sample", "arxiv_sample");
        } else {
            return false;
        }
        $.ajax({
            url: "configure-profile",
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
                hideInitialDocsUploadForm();
                docsUploaded(12);
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
    }

    var handleDocSampleButtons = function() {
        $('#nih-sample').on('click', function( e ) {
            handleDocSampleChoice(0);
        });
        $('#rcuk-sample').on('click', function( e ) {
            handleDocSampleChoice(1);
        });
        $('#arxiv-sample').on('click', function( e ) {
            handleDocSampleChoice(2);
        });
    }

    var hideInitialDocsUploadForm = function() {
        $('#initial-docs-upload-form').hide();
    }

    var init = function(){
        localStorage.clear();
        handleMatchLevelChoice();
        handleWordsInput();
        handleDocSampleButtons();
        handleFileUploadInput();
        handleNextButton();
    };

    //start all
    init();

})();
