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

    var match_level_choice = -1;
    var advanced_options_open = 0;

    var handleMatchLevelChoice = function() {
        $('#1-level').on('click', function( e ) {
            if (advanced_options_open) {
                UIkit.accordion($('#advanced-opts-toggle')).toggle(0, true);
                advanced_options_open = 0;
            }
            if (match_level_choice != 0) {
                deleteAllWords(0,1);
                deleteAllWords(0,0);
                console.log('#1-level');
                // store change to localstorage
                localStorage.setItem('matchlevel', "#1-level");
                // Add the positive words
                addDataToTable(generateId(1), 'European Grid Infrastructure', 1, 1);
                addDataToTable(generateId(1), 'EGI', 1, 1);
                addDataToTable(generateId(1), 'European Grid Initiative', 1, 1);
            }
            match_level_choice = 0;
        });
        $('#2-level').on('click', function( e ) {
            if (advanced_options_open) {
                UIkit.accordion($('#advanced-opts-toggle')).toggle(0, true);
                advanced_options_open = 0;
            }
            if (match_level_choice != 1) {
                deleteAllWords(0,1);
                deleteAllWords(0,0);
                console.log('#2-level');
                // store change to localstorage
                localStorage.setItem('matchlevel', "#2-level");
            }
            match_level_choice = 1;
        });
        $('#3-level').on('click', function( e ) {
            if (advanced_options_open) {
                UIkit.accordion($('#advanced-opts-toggle')).toggle(0, true);
                advanced_options_open = 0;
            }
            if (match_level_choice != 2) {
                deleteAllWords(0,1);
                deleteAllWords(0,0);
                console.log('#3-level');
                // store change to localstorage
                localStorage.setItem('matchlevel', "#3-level");
            }
            match_level_choice = 2;
        });
        $('#c-level').on('click', function( e ) {
            if (advanced_options_open == 0) {
                UIkit.accordion($('#advanced-opts-toggle')).toggle(0, true);
                advanced_options_open = 1;
            }
            if (match_level_choice != 3) {
                console.log('#c-level');
                // store change to localstorage
                localStorage.setItem('matchlevel', "#c-level");
            }
        });
        // $('#advanced-opts-toggle').on('show', function () {
        //     console.log('#GG-level');
        //     UIkit.switcher($('#uk-switcher')).show(3);
        //     UIkit.switcher($('.uk-switcher')).show(3);
        //     advanced_options_open = 1;
        // });
        // $('#advanced-opts-toggle').on('hide', function () {
        //     console.log('#BB-level');
        //     UIkit.switcher($('#uk-switcher')).show(match_level_choice);
        //     UIkit.switcher($('.uk-switcher')).show(match_level_choice);
        //     advanced_options_open = 0;
        // });
        
        $('#advanced-opts-toggle').on('show', function () {
            console.log('#GG-level');
            advanced_options_open = 1;
            $('#c-level').click();
        });
        $('#advanced-opts-toggle').on('hide', function () {
            console.log('#BB-level');
            advanced_options_open = 0;
            if (match_level_choice == 0) {
                match_level_choice = 3;
                $('#1-level').click();
            } else if (match_level_choice == 1) {
                match_level_choice = 3;
                $('#2-level').click();
            } else if (match_level_choice == 2) {
                match_level_choice = 3;
                $('#3-level').click();
            }
        });

        // UIkit.accordion($('#advanced-opts-toggle')).toggle(0, true);
        // UIkit.switcher($('#uk-switcher')).show(3);
        // UIkit.switcher($('.uk-switcher')).show(3);
    }

/////////// LIST FUNCTIONS

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
            $(currentEle).html('<input style="width:100%" class="thVal" type="number" min="0" max="100" value="' + value + '" />');
        }
        $(".thVal").focus();
        $(".thVal").keyup(function (event) {
            // Handle Enter key
            if (event.keyCode == 13) {
                var new_val = $(".thVal").val();
                $(currentEle).html($(".thVal").val().trim());
                if (isPhrase || (new_val != '' && !isNaN(new_val) && new_val >= 0 && new_val <= 100)) {
                    $(currentEle).html($(".thVal").val());
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
        // remove from localstorage
        localStorage.remove('#' + id);
        if (is_pos === 1) {
            count_pos--;
        } else {
            count_neg--;
        }
        updateCounter(is_pos);
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
            addDoubleClick($(createdItem).find("td.phrase"));
            addDoubleClick($(createdItem).find("td.weight"));
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
            // store into localstorage
            var obj = {};
            obj["phrase"] = content_word;
            obj["weight"] = content_weight;
            localStorage.setItem(id, JSON.stringify(obj));
            for(var key in localStorage){
              if (key === null)
                continue;
              var json_string = localStorage.getItem(key);
                console.log(key+' '+json_string);
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
        updateCounter(1);
        updateCounter(0);
        handleDeleteButtons();
    };

    var deleteAllWords = function(warnUser = 1, is_pos) {
        if(!warnUser || confirm('Are you sure you want to delete all the items in the list? There is no turning back after that.')){                 //remove items from DOM
            if (is_pos) {
                var items = $('tr[id ^= positive]');
                items.addClass('removed-item').one('webkitAnimationEnd oanimationend msAnimationEnd animationend', function(e) {
                  $(this).remove();
                });
                // Delete all pos from local storage
                for(var key in localStorage){
                    if (key === null)
                        continue;
                    var json_string = localStorage.getItem(key);
                    if(key.indexOf('positive') === 0){
                        localStorage.removeItem(key);
                    }
                }
                count_pos = 0;
                updateCounter(1);
            } else {
                var items = $('tr[id ^= negative]');
                items.addClass('removed-item').one('webkitAnimationEnd oanimationend msAnimationEnd animationend', function(e) {
                  $(this).remove();
                });
                // Delete all neg from local storage
                for(var key in localStorage){
                    if (key === null)
                        continue;
                    var json_string = localStorage.getItem(key);
                    if(key.indexOf('negative') === 0){
                        localStorage.removeItem(key);
                    }
                }
                count_neg = 0;
                updateCounter(0);
            }
        }
    };

    //handler for the "delete all" button
    var handleDeleteButtons = function(){
        $('#clear-all-pos').on('click', function() { deleteAllWords(1,1);});
        $('#clear-all-neg').on('click', function() { deleteAllWords(1,0)});
    };

    var handleFiltersInput = function() {
        $("#letter-case-select").on('change', function(e) {
            localStorage.setItem('lettercase', $("#letter-case-select option:selected").text());
        });
        $("#word-split").on('change', function(e) {
            localStorage.setItem('wordssplitnum', $("#word-split").val());
        });
        $("#stop-words-filter").on('change', function(e) {
            localStorage.setItem('stopwords', $('#stop-words-filter').prop('checked')===true?1:0);
            console.log('stop-words-filter '+localStorage.getItem('stopwords'));
        });
        $("#punctuation-filter").on('change', function(e) {
            localStorage.setItem('punctuation', $('#punctuation-filter').prop('checked')===true?1:0);
            console.log('punctuation-filter '+localStorage.getItem('punctuation'));
        });
    }

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
                    obj = JSON && JSON.parse(data) || $.parseJSON(data);
                    console.log(obj);
                    // get poswords
                    var poswords = [];
                    if (obj.hasOwnProperty("poswords")) {
                        poswords = obj["poswords"];
                    }
                    // get poswords
                    var negwords = [];
                    if (obj.hasOwnProperty("negwords")) {
                        negwords = obj["negwords"];
                    }
                    // get matches
                    var matches = [];
                    if (obj.hasOwnProperty("matches")) {
                        doc_matches = obj["matches"];
                        for (var docname in doc_matches) {
                            if (doc_matches.hasOwnProperty(docname)) {
                                // create document section
                                var li = $('<li class="uk-open"><h3 class="uk-accordion-title">'+docname+'</h3></li>');
                                // create matches section
                                word_matches = doc_matches[docname];
                                var accordion_content = $('<div class="uk-accordion-content"></div>');
                                for (var match in word_matches) {
                                    console.log(word_matches[match]);
                                    var result = word_matches[match];
                                    var paragraph = $('<p class="document-result">'+result.context.split(' ').map(function(x){return "<word>"+x+"</word>";}).join('')+'</p>');
                                    // find center match string and surrounded text
                                    var matched = paragraph.find(":contains('"+result.match+"')");
                                    var prev = matched.prev();
                                    var next = matched.next();
                                    // get textwindows text as context
                                    var context = [];
                                    var prev_context = [];
                                    var next_context = [];
                                    for (i = 0; prev.text()!=''; i++) {
                                        if (i < 10) {
                                            context.unshift(prev.text());
                                        } else {
                                            prev_context.unshift(prev.text());
                                        }
                                        prev = prev.prev();
                                    }
                                    context.push(matched.text());
                                    for (i = 0; next.text()!=''; i++) {
                                        if (i < 5) {
                                            context.push(next.text());
                                        } else {
                                            next_context.push(next.text());
                                        }
                                        next = next.next();
                                    }
                                    // hightlight textwindow
                                    context = $('<span class="textwindow" style="background-color: #fff2ba;">'+context.join(' ')+'</span>');
                                    // hightlight positive words
                                    for (var index in poswords) {
                                        var search_regexp = new RegExp(poswords[index], "g");
                                        context.html(context.html().replace(search_regexp,"<span style='background: #a5ffbf;' class='positive'>"+poswords[index]+"</span>"));
                                    }
                                    // hightlight acknowledgment keywords
                                    if (result.hasOwnProperty("acknmatch")) {
                                        var acknmatches = result["acknmatch"];
                                        for (var index in acknmatches) {
                                            var search_regexp = new RegExp(acknmatches[index], "g");
                                            context.html(context.html().replace(search_regexp,"<span style='background: #a5ffbf;' class='positive'>"+acknmatches[index]+"</span>"));
                                        }
                                    }
                                    // hightlight negative words
                                    for (var index in negwords) {
                                        var search_regexp = new RegExp(negwords[index], "g");
                                        context.html(context.html().replace(search_regexp,"<span style='background: #ffc5c5;' class='negative'>"+negwords[index]+"</span>"));
                                    }
                                    // hightlight matched phrase
                                    var search_regexp = new RegExp(result.match, "g");
                                    context.html(context.html().replace(search_regexp,"<span style='background: #aee4f7;' class='highlight'><b>"+result.match+"</b></span>"));

                                    // construct results paragraph to show
                                    paragraph = $('<p class="document-result">'+prev_context.join(' ')+' '+context[0].outerHTML+' '+next_context.join(' ')+'</p>');

                                    li.append(paragraph);
                                }
                                $("#docs-results").append(li);
                            }
                        }
                        UIkit.accordion($("#docs-results"));
                    }
                    $("#results-section").show();
                    // split all paragraphs to word spans
                    // $(".document-result").each(function() {
                    //     $(this).html($( this ).text().split(' ').map(function(x){return "<word>"+x+" </word>";}).join(''));
                    //     var search_regexp = new RegExp("dolor", "g");
                    //     $(this).html($(this).html().replace(search_regexp,"<span style='background: #c7ecc7;' class='highlight'>"+"AAAAAAAAA"+"</span>"));
                    //     var matched = $(this).find(".highlight").parent();
                    //     var prev = matched.prev();
                    //     var next = matched.next();
                    //     matched.css("background-color", "#fff2ba");
                    //     // hightlight all prev window words
                    //     for (i = 0; i < 3; i++) {
                    //         prev.css("background-color", "#fff2ba");
                    //         prev = prev.prev();
                    //     }
                    //     // hightlight all next window words
                    //     for (i = 0; i < 3; i++) {
                    //         next.css("background-color", "#fff2ba");
                    //         next = next.next();
                    //     }
                    // });
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

    var uploadedDocs = 0

    var docsUploaded = function(docsNumber) {
        uploadedDocs = docsNumber;
        $("#docs-number").html(docsNumber+" documents uploaded");
    }

    var hideInitialDocsUploadForm = function() {
        console.log("AAAAAAAAA")
        $("#docs-more-btn").show();
        $("#run-mining-btn").removeAttr('disabled').removeClass('disabled');
        $('#documents-change-btn').addClass("uk-button");
        $('#initial-docs-upload-form').attr("class", "");
        $('#initial-docs-upload-form').attr("uk-dropdown", "mode: click;");
        $('#initial-docs-upload-form').appendTo("#documents-section");
        UIkit.dropdown($("#initial-docs-upload-form"));
        UIkit.dropdown($("#initial-docs-upload-form")).mode = "click";
        handleRunMiningButton();
    }

    var handleFileUploadInput = function() {
        $("#docs-file-input").on('change', function() {
            if ($('#docs-file-input')[0].value === "") {
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
// TODO TODO TODO TODO TODO TODO check for error
                    obj = JSON && JSON.parse(data).data || $.parseJSON(data).data;
                    // console.log(obj);
                    if (obj > 0) {
                        if (uploadedDocs == 0) {
                            hideInitialDocsUploadForm();
                        }
                        docsUploaded(obj);
                        UIkit.dropdown($("#initial-docs-upload-form")).hide();
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
            $("#docs-file-input")[0].value = "";

            return false;
        });
    }

    var handleDocSampleChoice = function(btnIndex) {
        var formData = new FormData();
        if (btnIndex === 0) {
            formData.append("doc_sample", "egi_sample");
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
// TODO TODO TODO TODO TODO TODOcheck for error
                obj = JSON && JSON.parse(data).data || $.parseJSON(data).data;
                if (obj > 0) {
                    if (uploadedDocs == 0) {
                        hideInitialDocsUploadForm();
                    }
                    docsUploaded(obj);
                    UIkit.dropdown($("#initial-docs-upload-form")).hide();
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
    }

    var handleDocSampleButtons = function() {
        $('#egi-sample').on('click', function( e ) {
            handleDocSampleChoice(0);
        });
        $('#rcuk-sample').on('click', function( e ) {
            handleDocSampleChoice(1);
        });
        $('#arxiv-sample').on('click', function( e ) {
            handleDocSampleChoice(2);
        });
    }

    var handleSaveProfileInfoSend = function() {
        var formData = new FormData();
        formData.append("createprofile", "1")
        formData.append("poswords", JSON.stringify(wordsDataToArray(1)));
        formData.append("negwords", JSON.stringify(wordsDataToArray(0)));
        filters_list = {};
        filters_list["lettercase"] = $("#letter-case-select option:selected").text();
        filters_list["wordssplitnum"] = $("#word-split").val();
        filters_list["stopwords"] = $('#stop-words-filter').prop('checked')===true?1:0;
        filters_list["punctuation"] = $('#punctuation-filter').prop('checked')===true?1:0;
        formData.append("filters", JSON.stringify(filters_list));
        $.ajax({
            url: "save-profile",
            type: 'POST',
            data: formData,
            async: false,
            success: function (data) {
                console.log(data)
                // if (data.indexOf('successfully!') != -1) {
                //   $('#file-uploaded')[0].checked = true;
                // }
                window.location="save-profile"
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

    var handleSaveProfileButtons = function() {
        $("#next-button").on('click', function(e) {
            handleSaveProfileInfoSend();
        });
        $("#save-profile-option").on('click', function(e) {
            handleSaveProfileInfoSend();
        });
    }

    var checkAlreadyUploadedDocs = function() {
      var formData = new FormData();
      formData.append("already", "");
      $.ajax({
          url: "configure-profile",
          type: 'POST',
          data: formData,
          async: false,
          success: function (data) {
              obj = JSON && JSON.parse(data).data || $.parseJSON(data).data;
              console.log(data);
              if (obj > 0) {
                hideInitialDocsUploadForm();
                docsUploaded(obj);
              } else if (obj == -1) {
                localStorage.clear();
              }
              init();
          },
          error: function (xhr, ajaxOptions, thrownError) {
            $('#codes-file-upload-response').html('<b style=\"color: red\">File Failed to Upload!</b>'+xhr.status)
            // $('#file-uploaded')[0].checked = false;
          },
          cache: false,
          contentType: false,
          processData: false
      });
    }

    var checkAlreadyMiningSettings = function() {
        for (var key in localStorage) {
          if (key === null)
            continue;
          var value = localStorage.getItem(key);
            console.log(key+' '+value);
          if(key.indexOf('positive') === 0){
            data = JSON.parse(value);
            addDataToTable(key, data.phrase, data.weight, 1);
          } else if(key.indexOf('negative') === 0) {
            data = JSON.parse(value);
            addDataToTable(key, data.phrase, data.weight, 0);
          } else if (key === 'matchlevel') {
            console.log(key+' '+value);
            $(value).click();
          } else if (key === 'lettercase') {
            $("#letter-case-select").val(value);
          } else if (key === 'wordssplitnum') {
            $("#word-split").val(value)
          } else if (key === 'stopwords') {
            if (value == 1) {
                $("#stop-words-filter").prop('checked', true);
                $("#stop-words-filter").attr('checked', true);
                $('#stop-words-filter')[0].checked = true;
            } else if (value == 0) {
                $("#stop-words-filter").prop('checked', false);
                $("#stop-words-filter").attr('checked', false);
                $('#stop-words-filter')[0].checked = false;
                $('#stop-words-filter').removeAttr('checked');
            }
          } else if (key === 'punctuation') {
            if (value == 1) {
                $("#punctuation-filter").prop('checked', true);
                $("#punctuation-filter").attr('checked', true);
                $('#punctuation-filter')[0].checked = true;
            } else if (value == 0) {
                $("#punctuation-filter").prop('checked', false);
                $("#punctuation-filter").attr('checked', false);
                $('#punctuation-filter')[0].checked = false;
                $('#punctuation-filter').removeAttr('checked');
            }
          }
        }
        if (localStorage.getItem('matchlevel') === null) {
            // Click the by default option
            $('#1-level').click();
        }
    }

    var init = function(){
        handleMatchLevelChoice();
        checkAlreadyMiningSettings();
        handleWordsInput();
        handleFiltersInput();
        handleDocSampleButtons();
        handleFileUploadInput();
        handleSaveProfileButtons();
    };

    //start all
    checkAlreadyUploadedDocs();

})();
