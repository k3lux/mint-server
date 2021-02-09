class mintDocument {
    constructor() {
        this.locked = false;
    }

    htmlEscape(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/>/g, '&gt;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;');
    }

    load(key, callback, lang) {
        var _this = this;

        $.ajax('/documents/' + key, {
            type: 'get',
            dataType: 'json',
            success: function(res) {
                _this.locked = true;
                _this.key = key;
                _this.data = res.data;

                try {
                    var high;

                    if (lang == 'txt') {
                        high = { value: _this.htmlEscape(res.data) };
                    } else if (lang) {
                        high = hljs.highlight(lang, res.data);
                    } else {
                        high = hljs.highlightAuto(res.data);
                    }
                } catch(error) {
                    high = hljs.highlightAuto(res.data);
                }

                callback({
                    key: key,
                    value: high.value,
                    lang: high.language || lang,
                    lineCount: res.data.split('\n').length
                });
            },
            error: function() {
                callback(false);
            }
        });
    }

    save(data, callback) {
        if (this.locked) return false;

        this.data = data;
        var _this = this;

        $.ajax('/documents', {
            type: 'post',
            data: data,
            dataType: 'json',
            contentType: 'text/plain; charset=utf-8',
            success: function(res) {
                _this.locked = true;
                _this.key = res.key;

                var high = hljs.highlightAuto(data);

                callback(null, {
                    key: res.key,
                    value: high.value,
                    lang: high.language,
                    lineCount: data.split('\n').length
                });
            },
            error: function() {
                try {
                    callback($.parseJSON(res.responseText));
                } catch(e) {
                    callback({
                        message: 'Something went wrong.'
                    });
                }
            }
        });
    }
}

class App {
    constructor(appName, options) {
        this.appName = appName;
        this.$textarea = $('textarea');
        this.$box = $('#box');
        this.$code = $('#box code');
        this.$linenos = $('#linenos');
        this.options = options;
  
        this.configureShortcuts();
        this.configureButtons();
    }

    setTitle(str) {
        var title = str ? this.appName + ' - ' + str : this.appName;
        document.title = title;
    }

    showMessage(message, clss) {
        var msgBox = $('<li class="'+(clss || 'info')+'">'+message+'</li>');
        
        $('#messages').prepend(msgBox);
  
        setTimeout(function() {
            msgBox.slideUp('fast', function() { $(this).remove(); });
        }, 3000);
    }

    lightKey() {
        this.configureKey(['new', 'save']);
    }

    fullKey() {
        this.configureKey(['new', 'duplicate', 'raw']);
    }
    
    configureKey(enable) {
        var $this, i = 0;

        $('#box2 .function').each(function() {
            $this = $(this);
            
            for (i = 0; i < enable.length; i++) {
                if ($this.hasClass(enable[i])) {
                    $this.addClass('enabled');
                    
                    return true;
                }
            }
            $this.removeClass('enabled');
        });
    }

    newDocument(hideHistory) {
        this.$box.hide();
        this.doc = new mintDocument();
        
        if (!hideHistory) {
            window.history.pushState(null, this.appName, '/');
        }
  
        this.setTitle();
        this.lightKey();
        this.$textarea.val('').show('fast', function() {
            this.focus();
        });
        this.removeLineNumbers();
    }

    lookupExtByType(type) {
        for (var key in App.extensionMap) {
            if (App.extensionMap[key] === type) return key;
        }
        
        return type;
    }

    lookupTypeByExt(ext) {
        return App.extensionMap[ext] || ext;
    }

    addLineNumbers(lineCount) {
        var h = '';
            
        for (var i = 0; i < lineCount; i++) {
            h += (i + 1).toString() + '<br/>';
        }
  
        $('#linenos').html(h);
    }

    removeLineNumbers() {
        $('#linenos').html('&gt;');
    }

    loadDocument(key) {
        var _this = this;
        var parts = key.split('.', 2);

        _this.doc = new mintDocument();
        _this.doc.load(parts[0], function(res) {
            if (res) {
                _this.$code.html(res.value);
                _this.setTitle(res.key);
                _this.fullKey();
                _this.$textarea.val('').hide();
                _this.$box.show().focus();
                _this.addLineNumbers(res.lineCount);
            } else {
                _this.newDocument();
            }
        }, this.lookupTypeByExt(parts[1]));
    }

    duplicateDocument() {
        if (this.doc.locked) {
            var currentData = this.doc.data;
    
            this.newDocument();
            this.$textarea.val(currentData);
        }
    }

    lockDocument() {
        var _this = this;

        this.doc.save(this.$textarea.val(), function(err, res) {
            if (err) { 
                _this.showMessage(err.message, 'error');
            } else if (res) {
                _this.$code.html(res.value);
                _this.setTitle(res.key);
                
                var file = '/' + res.key;
                if (res.lang) {
                    file += '.' + _this.lookupExtByType(res.lang);
                }

                window.history.pushState(null, _this.appName + '-' + res.key, file);
                _this.fullKey();
                _this.$textarea.val('').hide();
                _this.$box.show().focus();
                _this.addLineNumbers(res.lineCount);
            }
        });
    }

    configureButtons() {
        var _this = this;

        this.buttons = [
        {
            $where: $('#box2 .save'),
            label: 'Save',
            shortcutDescription: 'control + s',
            shortcut: function(evt) {
                return evt.ctrlKey && (evt.keyCode === 83);
            },
            action: function() {
                if (_this.$textarea.val().replace(/^\s+|\s+$/g, '') !== '') {
                    _this.lockDocument();
                }
            }
        },
        {
            $where: $('#box2 .new'),
            label: 'New',
            shortcut: function(evt) {
                return evt.ctrlKey && evt.keyCode === 78;
            },
            shortcutDescription: 'control + n',
            action: function() {
                _this.newDocument(!_this.doc.key);
            }
        },
        {
            $where: $('#box2 .duplicate'),
            label: 'Duplicate & Edit',
            shortcut: function(evt) {
                return _this.doc.locked && evt.ctrlKey && evt.keyCode === 68;
            },
            shortcutDescription: 'control + d',
            action: function() {
                _this.duplicateDocument();
            }
        },
        {
            $where: $('#box2 .raw'),
            label: 'Raw',
            shortcut: function(evt) {
                return evt.ctrlKey && evt.shiftKey && evt.keyCode === 82;
            },
            shortcutDescription: 'control + shift + r',
            action: function() {
                window.location.href = '/raw/' + _this.doc.key;
            }
        },
        ];
        
        for (var i = 0; i < this.buttons.length; i++) {
            this.configureButton(this.buttons[i]);
        }
    }

    configureButton(options) {
        options.$where.click(function(evt) {
            evt.preventDefault();
            
            if (!options.clickDisabled && $(this).hasClass('enabled')) {
                options.action();
            }
        });

        options.$where.mouseenter(function() {
            $('#box3 .label').text(options.label);
            $('#box3 .shortcut').text(options.shortcutDescription || '');
            $('#box3').show();
            $(this).append($('#pointer').remove().show());
        });

        options.$where.mouseleave(function() {
            $('#box3').hide();
            $('#pointer').hide();
        });
    }

    configureShortcuts() {
        var _this = this;

        $(document.body).keydown(function(evt) {
            var button;
    
            for (var i = 0 ; i < _this.buttons.length; i++) {
                button = _this.buttons[i];
                
                if (button.shortcut && button.shortcut(evt)) {
                    evt.preventDefault();
                    button.action();
        
                    return;
                }
            }
        });
    }
}

App.extensionMap = {
    rb: 'ruby', py: 'python', pl: 'perl', php: 'php', scala: 'scala', go: 'go',
    xml: 'xml', html: 'xml', htm: 'xml', css: 'css', js: 'javascript', vbs: 'vbscript',
    lua: 'lua', pas: 'delphi', java: 'java', cpp: 'cpp', cc: 'cpp', m: 'objectivec',
    vala: 'vala', sql: 'sql', sm: 'smalltalk', lisp: 'lisp', ini: 'ini',
    diff: 'diff', bash: 'bash', sh: 'bash', tex: 'tex', erl: 'erlang', hs: 'haskell',
    md: 'markdown', txt: '', coffee: 'coffee', swift: 'swift', ts: 'typescript'
}

$(function() {
    $('textarea').keydown(function(evt) {
        if (evt.keyCode === 9) {
            evt.preventDefault();
            var myValue = '  ';

            if (document.selection) {
                this.focus();
                var sel = document.selection.createRange();
                sel.text = myValue;
                this.focus();
            } else if (this.selectionStart || this.selectionStart == '0') {
                var startPos = this.selectionStart;
                var endPos = this.selectionEnd;
                var scrollTop = this.scrollTop;
        
                this.value = this.value.substring(0, startPos) + myValue +
                this.value.substring(endPos,this.value.length);
                this.focus();
                this.selectionStart = startPos + myValue.length;
                this.selectionEnd = startPos + myValue.length;
                this.scrollTop = scrollTop;
            } else {
                this.value += myValue;
                this.focus();
            }
        }
    });
});