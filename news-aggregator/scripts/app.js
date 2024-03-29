/**
 *
 * Copyright 2015 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
APP.Main = (function () {

  var LAZY_LOAD_THRESHOLD = 300;
  var $ = document.querySelector.bind(document);

  var stories = null;
  var storyStart = 0;
  var count = 100;
  var main = $('main');
  var inDetails = false;
  var storyLoadCount = 0;
  var localeData = {
    data: {
      intl: {
        locales: 'en-US'
      }
    }
  };

  var tmplStory = $('#tmpl-story').textContent;
  var tmplStoryDetails = $('#tmpl-story-details').textContent;
  var tmplStoryDetailsComment = $('#tmpl-story-details-comment').textContent;

  var header = $('header');
  var headerTitles = header.querySelector('.header__title-wrapper');

  if (typeof HandlebarsIntl !== 'undefined') {
    HandlebarsIntl.registerWith(Handlebars);
  } else {

    // Remove references to formatRelative, because Intl isn't supported.
    var intlRelative = /, {{ formatRelative time }}/;
    tmplStory = tmplStory.replace(intlRelative, '');
    tmplStoryDetails = tmplStoryDetails.replace(intlRelative, '');
    tmplStoryDetailsComment = tmplStoryDetailsComment.replace(intlRelative, '');
  }

  var storyTemplate =
    Handlebars.compile(tmplStory);
  var storyDetailsTemplate =
    Handlebars.compile(tmplStoryDetails);
  var storyDetailsCommentTemplate =
    Handlebars.compile(tmplStoryDetailsComment);

  /**
   * As every single story arrives in shove its
   * content in at that exact moment. Feels like something
   * that should really be handled more delicately, and
   * probably in a requestAnimationFrame callback.
   */
  function onStoryData(key, details) {

    // This seems odd. Surely we could just select the story
    // directly rather than looping through all of them.
    var storyElements = document.querySelectorAll('.story');

    requestAnimationFrame(function() {
      for (var i = 0; i < storyElements.length; i++) {

        if (storyElements[i].getAttribute('id') === 's-' + key) {
  
          details.time *= 1000;
          var story = storyElements[i];
          var html = storyTemplate(details);
          story.innerHTML = html;
          story.addEventListener('click', onStoryClick.bind(this, details));
          story.classList.add('clickable');
  
          // Tick down. When zero we can batch in the next load.
          storyLoadCount--;
  
        }
      }
    })

    // Colorize on complete.
    if (storyLoadCount === 0)
      colorizeAndScaleStories();
  }

  function onStoryClick(details) {

    var storyDetails = $('.story-details');

    if (!storyDetails) {
      return;
    }

    // Create and append the story. A visual change...
    // perhaps that should be in a requestAnimationFrame?
    // And maybe, since they're all the same, I don't
    // need to make a new element every single time? I mean,
    // it inflates the DOM and I can only see one at once.

    if (details.url)
      details.urlobj = new URL(details.url);

    var comment;
    var commentsElement;
    var storyHeader;
    var storyContent;

    requestAnimationFrame(function () {
      var storyDetailsHtml = storyDetailsTemplate(details);
      var kids = details.kids;
      var commentHtml = storyDetailsCommentTemplate({
        by: '', text: 'Loading comment...'
      });
      storyDetails.innerHTML = storyDetailsHtml;

      commentsElement = storyDetails.querySelector('.js-comments');
      storyHeader = storyDetails.querySelector('.js-header');
      storyContent = storyDetails.querySelector('.js-content');
  
      var closeButton = storyDetails.querySelector('.js-close');
      closeButton.addEventListener('click', hideStory.bind(this, details.id));
  
      var headerHeight = storyHeader.getBoundingClientRect().height;
      storyContent.style.paddingTop = headerHeight + 'px';
  
      if (typeof kids === 'undefined')
        return;
  
      for (var k = 0; k < kids.length; k++) {
  
        comment = document.createElement('aside');
        comment.setAttribute('id', 'sdc-' + kids[k]);
        comment.classList.add('story-details__comment');
        comment.innerHTML = commentHtml;
        commentsElement.appendChild(comment);
  
        // Update the comment with the live data.
        APP.Data.getStoryComment(kids[k], function (commentDetails) {
  
          commentDetails.time *= 1000;
  
          var comment = commentsElement.querySelector(
            '#sdc-' + commentDetails.id);
          comment.innerHTML = storyDetailsCommentTemplate(
            commentDetails,
            localeData);
        });
        showStory();
    }
    })
  }

  function showStory(id) {

    if (inDetails)
      return;

    inDetails = true;

    var storyDetails = $('.story-details');
    if (!storyDetails) {
      return;
    }
    storyDetails.style.transform = 'translateX(0%)';
  }

  function hideStory(id) {

    if (!inDetails)
      return;

    inDetails = false;
    var storyDetails = $('.story-details');
    if (!storyDetails) {
      return;
    }
    storyDetails.style.transform = 'translateX(100%)';
  }

  /**
   * Does this really add anything? Can we do this kind
   * of work in a cheaper way?
   */
  function colorizeAndScaleStories(mainHeight) {
    var storyElements = document.querySelectorAll('.story');

    // It does seem awfully broad to change all the
    // colors every time!
    var fstScorePosition = storyElements[0].querySelector('.story__score').getBoundingClientRect();
    var firstStoryHeight = storyElements[0].offsetHeight;
    for (var s = 0; s < storyElements.length; s++) {

      var story = storyElements[s];
      var score = story.querySelector('.story__score');
      var title = story.querySelector('.story__title');

      // Base the scale on the y position of the score.
      var scoreLocation = fstScorePosition.top + (firstStoryHeight * (s + 1));
      var scale = Math.min(1, 1 - (0.05 * ((scoreLocation - 170) / mainHeight)));
      var opacity = Math.min(1, 1 - (0.5 * ((scoreLocation - 170) / mainHeight)));

      var newWidth = scale * 40
      score.style.transform = 'scale(' + scale + ')px';
      score.style.lineHeight = (scale * 40) + 'px';

      // Now figure out how wide it is and use that to saturate it.
      var saturation = (100 * ((newWidth - 38) / 2));

      score.style.backgroundColor = 'hsl(42, ' + saturation + '%, 50%)';
      title.style.opacity = opacity;
    }
  }

  main.addEventListener('touchstart', function (evt) {

    // I just wanted to test what happens if touchstart
    // gets canceled. Hope it doesn't block scrolling on mobiles...
    if (Math.random() > 0.97) {
      evt.preventDefault();
    }

  });

  main.addEventListener('scroll', function () {
    var mainScrollTop = main.scrollTop;
    var scrollTopCapped = Math.min(70, mainScrollTop);
    var scaleString = 'scale(' + (1 - (scrollTopCapped / 300)) + ')';
    var mainHeight = main.offsetHeight;
    var mainScrollHeight = main.scrollHeight;
    colorizeAndScaleStories(mainHeight);

    header.style.height = (156 - scrollTopCapped) + 'px';
    headerTitles.style.webkitTransform = scaleString;
    headerTitles.style.transform = scaleString;

    // Add a shadow to the header.
    if (mainScrollTop > 70)
      document.body.classList.add('raised');
    else
      document.body.classList.remove('raised');

    // Check if we need to load the next batch of stories.
    var loadThreshold = (mainScrollHeight - mainHeight -
      LAZY_LOAD_THRESHOLD);
    if (mainScrollTop > loadThreshold)
      loadStoryBatch();
  });

  function loadStoryBatch() {

    if (storyLoadCount > 0)
      return;

    storyLoadCount = count;

    var end = storyStart + count;
    for (var i = storyStart; i < end; i++) {

      if (i >= stories.length)
        return;

      var key = String(stories[i]);
      var story = document.createElement('div');
      story.setAttribute('id', 's-' + key);
      story.classList.add('story');
      story.innerHTML = storyTemplate({
        title: '...',
        score: '-',
        by: '...',
        time: 0
      });
      main.appendChild(story);

      APP.Data.getStoryById(stories[i], onStoryData.bind(this, key));
    }

    storyStart += count;

  }

  // Bootstrap in the stories.
  APP.Data.getTopStories(function (data) {
    stories = data;
    loadStoryBatch();
    main.classList.remove('loading');
  });

})();
