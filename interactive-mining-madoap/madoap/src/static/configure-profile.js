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
            $(".cm-config-option.active").removeClass("active");
            $(this).addClass("active");
            if (advanced_options_open) {
                toggleAdvancedTools();
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
            $(".cm-config-option.active").removeClass("active");
            $(this).addClass("active");
            if (advanced_options_open) {
                toggleAdvancedTools();
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
            $(".cm-config-option.active").removeClass("active");
            $(this).addClass("active");
            if (advanced_options_open) {
                toggleAdvancedTools();
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
        // $('#c-level').on('click', function( e ) {
        //     $(".cm-config-option.active").removeClass("active");
        //     $(this).addClass("active");
        //     if (advanced_options_open == 0) {
        //         toggleAdvancedTools();
        //         advanced_options_open = 1;
        //     }
        //     if (match_level_choice != 3) {
        //         console.log('#c-level');
        //         // store change to localstorage
        //         localStorage.setItem('matchlevel', "#c-level");
        //     }
        // });

        $("#advaned-tools-label").change(function() {
            if(this.checked) {
                advanced_options_open = 1;
                $(".cm-config-option.active").removeClass("active");
                // $('#c-level').click();
                $('#advaned-tools').show();
                localStorage.setItem('matchlevel', "#c-level");
            } else {
                advanced_options_open = 0;
                if (match_level_choice == 0 || match_level_choice == -1 || match_level_choice == 3) {
                    match_level_choice = 3;
                    $('#1-level').click();
                } else if (match_level_choice == 1) {
                    match_level_choice = 3;
                    $('#2-level').click();
                } else if (match_level_choice == 2) {
                    match_level_choice = 3;
                    $('#3-level').click();
                }
                $('#advaned-tools').hide();
            }
        });

        // UIkit.accordion($('#advanced-opts-toggle')).toggle(0, true);
        // UIkit.switcher($('#uk-switcher')).show(3);
        // UIkit.switcher($('.uk-switcher')).show(3);
    }

    var handlePreccisionMode = function(choice) {
        if (choice === "#c-level") {
            if (advanced_options_open == 0) {
                toggleAdvancedTools();
                advanced_options_open = 1;
            }
            if (match_level_choice != 3) {
                console.log('#c-level');
                // store change to localstorage
                localStorage.setItem('matchlevel', "#c-level");
            }
        } else {
            $(choice).click();
        }
    }

    var toggleAdvancedTools = function() {
        if($("#advaned-tools-label").prop('checked')) {
            $("#advaned-tools-label").prop('checked', false);
            $("#advaned-tools-label").attr('checked', false);
            $('#advaned-tools-label')[0].checked = false;
            $('#advaned-tools-label').removeAttr('checked');
            $('#advaned-tools').hide();
        } else {
            localStorage.setItem('matchlevel', "#c-level");
            $("#advaned-tools-label").prop('checked', true);
            $("#advaned-tools-label").attr('checked', true);
            $('#advaned-tools-label')[0].checked = true;
            $('#advaned-tools').show();
        }
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
    var generateId = function(is_pos) {
        if (is_pos) {
            return "positive-" + +new Date() + Math.random().toFixed(5).substring(2);
        } else {
            return "negative-" + +new Date() + Math.random().toFixed(5).substring(2);
        }
    }

    var wordAlreadyExists = function(is_pos, word) {
        var found = false;
        for (var key in localStorage) {
            if (key === null)
                continue;
            var value = localStorage.getItem(key);
            if(is_pos && key.indexOf('positive') === 0){
                data = JSON.parse(value);
                if (data.phrase === word) {
                    found = true;
                    alert("OOOOOOOOOP");
                    break;
                }
            } else if (key.indexOf('negative') === 0) {
                data = JSON.parse(value);
                if (data.phrase === word) {
                    found = true;
                    alert("OOOOOOOOOP");
                    break;
                }
            }
        }
        return found;
    }

    var wordsDataToArray = function(is_pos) {
        // TODO
        var data = {};
        if (is_pos === 1) {
            $("#word-pos li").each(function(i, v){
                // data[i] = Array();
                // $(this).children('td').each(function(ii, vv){
                //     data[i][ii] = $(this).text();
                // });
                data[$(v).find("div.phrase").text()] = $(v).find("div.weight").text();
            })
        } else {
            $("#word-neg li").each(function(i, v){
                // data[i] = Array();
                // $(this).children('td').each(function(ii, vv){
                //     data[i][ii] = $(this).text();
                // });
                data[$(v).find("div.phrase").text()] = $(v).find("div.weight").text();
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
            if($(event.target).hasClass('thVal')===false) {
                saveEditBox(clickedElement);
                $(document).off('click');
                clickedElement = null;
            }
        });
    }

    // a fucntion to catch double click on positive and negative phrases edit boxes
    var addDoubleClick = function(element){
        $(element).click(function (event) {
          if($(event.target).hasClass('thVal')===false) {
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
        localStorage.removeItem(id);
        if (is_pos === 1) {
            count_pos--;
        } else {
            count_neg--;
        }
        updateCounter(is_pos);
    };

    var count_pos = 0, count_neg = 0;

    var addDataToTable = function(id, content_word, content_weight, is_pos) {
        // with number column
        // var row = '<li class="uk-grid-collapse uk-child-width-expand@s" uk-grid id="' + id + '"><div class="cm-number-space uk-text-center uk-width-1-5@m">'+count_pos+'</div><div class="uk-width-expand uk-text-left cm-text-input phrase">' + content_word + '</div><div class="uk-width-1-4@m uk-text-left cm-text-input weight">' + content_weight +'</div></li>'
        var row = '<li class="uk-grid-collapse uk-child-width-expand@s" uk-grid id="' + id + '"><div class="uk-width-expand uk-text-left cm-text-input phrase">' + content_word + '</div><div class="uk-width-1-4@m uk-text-left cm-text-input weight">' + content_weight +'</div></li>'
        table = $('#data-table');

        // if content is correct and not empty append to table
        if(!$('#'+ id).length){

            row = $(row).addClass('new-item');
            if (is_pos === 1) {
                $('#word-pos').append(row);
            } else {
                $('#word-neg').append(row);
            }

            // add all the item's extra functionality
            var createdItem = $('#'+ id);
            // delete button
            createdItem.append($('<div />' , {"class": "uk-width-1-4@m uk-text-center erase"}).append($('<a />', {
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
            // store into localstorage
            var obj = {};
            obj["phrase"] = content_word;
            obj["weight"] = content_weight;
            localStorage.setItem(id, JSON.stringify(obj));
        }
    }

    var handleWordsInput = function(){
        $('#word-form-pos').on('submit', function(event){
            event.preventDefault();
            var input_word = $('#text-pos');
            word = input_word.val();
            if(wordAlreadyExists(1,word)) {
                return false;
            }
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
            if(wordAlreadyExists(0,word)) {
                return false;
            }
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
                var items = $('li[id ^= positive]');
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
                var items = $('li[id ^= negative]');
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
        $("#context-prev-words").on('change', function(e) {
            localStorage.setItem('contextprev', $("#context-prev-words").val());
        });
        $("#context-next-words").on('change', function(e) {
            localStorage.setItem('contextnext', $("#context-next-words").val());
        });
        $("#letter-case-radio .uk-radio").each(function() {$(this).on('change', function(e) {
            console.log("YEAH");
            localStorage.setItem('lettercase', $("#letter-case-radio input:checked").val());
        })});
        $("#word-split").on('change', function(e) {
            localStorage.setItem('wordssplitnum', $("#word-split").val());
        });
        $("#stop-words-filter").on('change', function(e) {
            localStorage.setItem('stopwords', $('#stop-words-filter').prop('checked')===true?1:0);
        });
        $("#punctuation-filter").on('change', function(e) {
            localStorage.setItem('punctuation', $('#punctuation-filter').prop('checked')===true?1:0);
        });
    }

    function highlightInElement(element, text){
        var elementHtml = element.html();
        var tags = [];
        var tagLocations= [];
        var htmlTagRegEx = /<{1}\/{0,1}\w+>{1}/;

        //Strip the tags from the elementHtml and keep track of them
        var htmlTag;
        while(htmlTag = elementHtml.match(htmlTagRegEx)){
            tagLocations[tagLocations.length] = elementHtml.search(htmlTagRegEx);
            tags[tags.length] = htmlTag;
            elementHtml = elementHtml.replace(htmlTag, '');
        }

        //Search for the text in the stripped html
        var textLocation = elementHtml.search(text);
        if(textLocation){
            //Add the highlight
            var highlightHTMLStart = "<span class='highlight'>";
            var highlightHTMLEnd = "</span>";
            elementHtml = elementHtml.replace(text, highlightHTMLStart + text + highlightHTMLEnd);

            //plug back in the HTML tags
            var textEndLocation = textLocation + text.length;
            for(i=tagLocations.length-1; i>=0; i--){
                var location = tagLocations[i];
                if(location > textEndLocation){
                    location += highlightHTMLStart.length + highlightHTMLEnd.length;
                } else if(location > textLocation){
                    location += highlightHTMLStart.length;
                }
                elementHtml = elementHtml.substring(0,location) + tags[i] + elementHtml.substring(location);
            }
        }

        //Update the innerHTML of the element
        element.html(elementHtml);
        return element;
    }

    var handleRunMiningButton = function() {
        $("#run-mining-btn").on('click', function( e ) {
            var formData = new FormData();
            formData.append("poswords", JSON.stringify(wordsDataToArray(1)));
            formData.append("negwords", JSON.stringify(wordsDataToArray(0)));
            formData.append("contextprev", $("#context-prev-words").val());
            formData.append("contextnext", $("#context-next-words").val());
            formData.append("lettercase", $("#letter-case-radio input:checked").val());
            formData.append("wordssplitnum", $("#word-split").val());
            formData.append("stopwords", $('#stop-words-filter').prop('checked')===true?1:0);
            formData.append("punctuation", $('#punctuation-filter').prop('checked')===true?1:0);
            // filters_list = {};
            // filters_list["lettercase"] = $("#letter-case-select option:selected").text();
            // filters_list["wordssplitnum"] = $("#word-split").val();
            // filters_list["stopwords"] = $('#stop-words-filter').prop('checked')===true?1:0;
            // filters_list["punctuation"] = $('#punctuation-filter').prop('checked')===true?1:0;
            // formData.append("filters", JSON.stringify(filters_list));
            $.ajax({
                url: "configure-profile",
                type: 'POST',
                data: formData,
                async: true,
                beforeSend: function () {
                    // UIkit.modal($("#wait-spinner-modal-center")).show();
                    $("#wait-spinner-modal-center").css("display", "flex");
                    $("#wait-spinner-modal-center").addClass("uk-open");

                },
                success: function (data) {
                    UIkit.modal($("#wait-spinner-modal-center")).hide();
                    respond = JSON && JSON.parse(data).respond || $.parseJSON(data).respond;
                    UIkit.notification({
                      message: respond,
                      status: 'success',
                      pos: 'top-center',
                      timeout: 5000
                    });
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
                        var matches_counter = 0;
                        doc_matches = obj["matches"];
                        $("#docs-results").empty();
                        for (var docname in doc_matches) {
                            if (doc_matches.hasOwnProperty(docname)) {
                                // create document section
                                var li = $('<li class="uk-card uk-card-default uk-card-small uk-card-body uk-open"><h3 class="uk-accordion-title">'+docname+'</h3></li>');
                                // create matches section
                                word_matches = doc_matches[docname];
                                var accordion_content = $('<div class="uk-accordion-content"></div>');
                                var doc_match_count = 1;
                                for (var match in word_matches) {
                                    console.log(word_matches[match]);
                                    var result = word_matches[match];
                                    // construct middle match
                                    // Find center match
                                    var match_regexp = new RegExp(result.match, "g");



                                    





                                    // var paragraph = $('<p class="document-result">'+result.context.split(' ').map(function(x){return "<word>"+x+"</word>";}).join('')+'</p>');
                                    // // find center match string and surrounded text
                                    // var matched = paragraph.find(":contains('"+result.match+"')");
                                    // var prev = matched.prev();
                                    // var next = matched.next();
                                    // get textwindows text as context
                                    var context = [];
                                    context.push(result.prev);
                                    context.push(result.middle);
                                    context.push(result.next);

                                    // var prev_context = [];
                                    // var next_context = [];
                                    // for (i = 0; prev.text()!=''; i++) {
                                    //     if (i < 10) {
                                    //         context.unshift(prev.text());
                                    //     } else {
                                    //         prev_context.unshift(prev.text());
                                    //     }
                                    //     prev = prev.prev();
                                    // }
                                    // context.push(matched.text());
                                    // for (i = 0; next.text()!=''; i++) {
                                    //     if (i < 5) {
                                    //         context.push(next.text());
                                    //     } else {
                                    //         next_context.push(next.text());
                                    //     }
                                    //     next = next.next();
                                    // }


                                    // hightlight textwindow
                                    context = $('<span class="textwindow">'+context.join(' ')+'</span>');
                                    // hightlight positive words
                                    for (var index in poswords) {
                                        var search_regexp = new RegExp(poswords[index], "g");
                                        context.html(context.html().replace(search_regexp,"<span class='positive'>"+poswords[index]+"</span>"));
                                    }
                                    // hightlight acknowledgment keywords
                                    if (result.hasOwnProperty("acknmatch")) {
                                        var acknmatches = result["acknmatch"];
                                        for (var index in acknmatches) {
                                            var search_regexp = new RegExp(acknmatches[index], "g");
                                            context.html(context.html().replace(search_regexp,"<span class='positive'>"+acknmatches[index]+"</span>"));
                                        }
                                    }
                                    // hightlight negative words
                                    for (var index in negwords) {
                                        var search_regexp = new RegExp(negwords[index], "g");
                                        context.html(context.html().replace(search_regexp,"<span class='negative'>"+negwords[index]+"</span>"));
                                    }

                                    // TESTTTTTTTTT
                                    context = highlightInElement(context, result.match);

                                    // // hightlight matched phrase
                                    // var search_regexp = new RegExp(result.match, "g");
                                    // context.html(context.html().replace(search_regexp,"<span style='background: #aee4f7;' class='highlight'><b>"+result.match+"</b></span>"));

                                    match_title = $('<h7 class="match">Match '+(matches_counter+1)+': '+result.match+'</h7>');
                                    doc_match_count++;
                                    matches_counter++;
                                    accordion_content.append(match_title);
                                    // construct results paragraph to show
                                    paragraph = $('<p class="cm-document-result">'+result.extraprev+' '+context[0].outerHTML+' '+result.extranext+'</p>');
                                    accordion_content.append(paragraph);
                                    li.append(accordion_content);
                                }
                                $("#docs-results").append(li);
                            }
                        }
                        UIkit.accordion($("#docs-results"));
                        var prev_res_cnt = $("#results-number").html();
                        $("#results-number").html(matches_counter+" matches found");
                        if (prev_res_cnt != "") {
                            $("#results-number-previous").html(prev_res_cnt+" previously");
                        }
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
                    UIkit.modal($("#wait-spinner-modal-center")).hide();
                    UIkit.notification({
                        message: xhr.status,
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

    var uploadedDocs = 0

    var docsUploaded = function(docsNumber) {
        uploadedDocs = docsNumber;
        $("#docs-number").html(docsNumber+" documents uploaded");
    }

    var hideInitialDocsUploadForm = function() {
        $(".cm-results-hide-pannel").hide();
        $("#docs-more-btn").show();
        $("#run-mining-btn").removeAttr('disabled').removeClass('disabled');
        $('#documents-change-btn').addClass("uk-button");
        $('#initial-docs-upload-form').attr("class", "");
        $('#initial-docs-upload-form').addClass("cm-docs-selection-form-dialog");
        $('#initial-docs-upload-form').attr("uk-dropdown", "mode: click;");
        $('#initial-docs-upload-form').appendTo("#documents-section");
        UIkit.dropdown($("#initial-docs-upload-form"));
        $("#initial-docs-upload-form").mode = "click";
        stickyResultsHeader = UIkit.sticky($("#cm-results-section-header"), {
            top: 25,
            showOnUp: true,
            animation: "uk-animation-slide-top",
            bottom: ".cm-results-section"
        });
        console.log(stickyResultsHeader);
        $("#initial-docs-upload-form").on('beforeshow', function () {
            $(".cm-results-hide-pannel").show();
            $(".cm-header-hide-pannel").addClass("cm-header-shown");
            stickyResultsHeader.$destroy();
            stickyResultsHeader = UIkit.sticky($("#cm-results-section-header"), {
                top: 25,
                bottom: ".cm-results-section"
            });
        });
        $("#initial-docs-upload-form").on('hidden', function () {
            $(".cm-results-hide-pannel").hide();
            $(".cm-header-hide-pannel").removeClass("cm-header-shown");
            stickyResultsHeader.$destroy();
            stickyResultsHeader = UIkit.sticky($("#cm-results-section-header"), {
                top: 25,
                showOnUp: true,
                animation: "uk-animation-slide-top",
                bottom: ".cm-results-section"
            });
            // stickyResultsHeader = UIkit.sticky($("#cm-results-section-header"), {
            //     top: 25,
            //     showOnUp: true,
            //     animation: "uk-animation-slide-top",
            //     bottom: ".cm-results-section"
            // });
        });
        handleRunMiningButton();
    }

    var handleFileUploadInput = function() {
        $("form#docs-file-input").on('change', function() {
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
                async: true,
                beforeSend: function () {
                    // UIkit.modal($("#wait-spinner-modal-center")).show();
                },
                success: function (data) {
                    // UIkit.modal($("#wait-spinner-modal-center")).hide();
                    respond = JSON && JSON.parse(data).respond || $.parseJSON(data).respond;
                    UIkit.notification({
                      message: respond,
                      status: 'success',
                      pos: 'top-center',
                      timeout: 5000
                    });
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
                    // UIkit.modal($("#wait-spinner-modal-center")).hide();
                    UIkit.notification({
                        message: xhr.status,
                        status: 'danger',
                        pos: 'top-center',
                        timeout: 0
                    });
                },
                cache: false,
                contentType: false,
                processData: false
            });
            $("#docs-file-input")[0].value = "";

            return false;
        });

        var bar = document.getElementById('js-progressbar');
        UIkit.upload('.js-upload', {
            url: 'configure-profile',
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
                // UIkit.modal($("#wait-spinner-modal-center")).hide();
                respond = JSON && JSON.parse(data.responseText).respond || $.parseJSON(data.responseText).respond;
                UIkit.notification({
                  message: respond,
                  status: 'success',
                  pos: 'top-center',
                  timeout: 5000
                });
                obj = JSON && JSON.parse(data.responseText).data || $.parseJSON(data.responseText).data;
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
            async: true,
            beforeSend: function () {
                // UIkit.modal($("#wait-spinner-modal-center")).show();
            },
            success: function (data) {
                // UIkit.modal($("#wait-spinner-modal-center")).hide();
                respond = JSON && JSON.parse(data).respond || $.parseJSON(data).respond;
                UIkit.notification({
                  message: respond,
                  status: 'success',
                  pos: 'top-center',
                  timeout: 5000
                });
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
                // UIkit.modal($("#wait-spinner-modal-center")).hide();
                UIkit.notification({
                    message: xhr.status,
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
        filters_list["contextprev"] = $("#context-prev-words").val();
        filters_list["contextnext"] = $("#context-next-words").val();
        filters_list["lettercase"] = $("#letter-case-radio input:checked").val();
        filters_list["wordssplitnum"] = $("#word-split").val();
        filters_list["stopwords"] = $('#stop-words-filter').prop('checked')===true?1:0;
        filters_list["punctuation"] = $('#punctuation-filter').prop('checked')===true?1:0;
        formData.append("filters", JSON.stringify(filters_list));
        $.ajax({
            url: "save-profile",
            type: 'POST',
            data: formData,
            async: true,
            beforeSend: function () {
                // UIkit.modal($("#wait-spinner-modal-center")).show();
            },
            success: function (data) {
                // UIkit.modal($("#wait-spinner-modal-center")).hide();
                console.log(data)
                // if (data.indexOf('successfully!') != -1) {
                //   $('#file-uploaded')[0].checked = true;
                // }
                window.location="save-profile"
            },
            error: function (xhr, ajaxOptions, thrownError) {
                // UIkit.modal($("#wait-spinner-modal-center")).hide();
                UIkit.notification({
                    message: xhr.status,
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

    var handleSaveProfileButtons = function() {
        $("#next-button").on('click', function(e) {
            handleSaveProfileInfoSend();
        });
        // $("#save-profile-option").on('click', function(e) {
        //     handleSaveProfileInfoSend();
        // });
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
              }
              init();
          },
          error: function (xhr, ajaxOptions, thrownError) {
            UIkit.notification({
                message: xhr.status,
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

    var checkAlreadyMiningSettings = function() {
        console.log(localStorage)
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
            handlePreccisionMode(value);
          } else if (key === 'contextprev') {
            $("#context-prev-words").val(value);
          } else if (key === 'contextnext') {
            $("#context-next-words").val(value);
          } else if (key === 'lettercase') {
            $('#letter-case-radio input.'+value).prop('checked', true);
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

    var stickyResultsHeader = null;

    var init = function(){
        $("#child1").stickySidebar();
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
