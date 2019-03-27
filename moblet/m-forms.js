/* eslint no-undef: [0]*/

module.exports = {
  title: "mForms",
  style: "m-forms.less",
  template: 'm-forms.html',
  i18n: {
    pt: "lang/pt-BR.json",
    es: "lang/es-ES.json",
    en: "lang/en-US.json"
  },
  link: function() {},
  controller: function(
    $scope,
    $rootScope,
    $filter,
    $timeout,
    $mState,
      $stateParams,
    $mDataLoader
  ) {
    var dadosIniciais = [];
    var dataLoadOptions;
    var list = {
      /**
       * Set the view and update the needed parameters
       * @param  {object} data Data received from Moblets backend
       * @param  {boolean} more If called by "more" function, it will add the
       * data to the items array
       */
      setView: function(data, more) {
        if (isDefined(data)) {
          console.log(data, "data do m-list");
          $scope.error = false;
          $scope.emptyData = false;
          $scope.itemStyle = data.itemStyle;
          var origData = JSON.stringify(data.items);

          if (data.search === true) {
            $rootScope.$broadcast('hideShowSearch', {data});
          }

          $scope.isCard = data.listStyle === "layout-2";
          $scope.isList = isDefined(data.listStyle) ? data.listStyle === "layout-1" : true;

          $scope.search = isDefined(data.search) ? data.search === true : false;

          // If it was called from the "more" function, concatenate the items
          $scope.items = (more) ? $scope.items.concat(data.items) : data.items;

          // Set "noContent" if the items lenght = 0
          $scope.moblet.noContent = $scope.items === undefined ||
                             $scope.items.length === 0;

          // set empty itens if no content
          if ($scope.moblet.noContent) {
            $scope.items = [];
          }

          // Check if the page is loading the list or a detail
          $scope.isDetail = list.isDetail();

          // Disable the "more" function if the API don't have more items
          $scope.more = (data.hasMoreItems) ? list.more : undefined;
        } else {
          $scope.error = true;
          $scope.emptyData = true;
        }

        // Broadcast complete refresh and infinite scroll
        $rootScope.$broadcast('scroll.refreshComplete');
        $rootScope.$broadcast('scroll.infiniteScrollComplete');

        if (!$scope.isDetail) {
          $rootScope.$broadcast('show-search', {data});
        }

        $scope.$on("update-data", function(event, args) { 
          console.log(document.getElementById('input-search').style.color);

          if ($scope.items.length < dadosIniciais.length) {
            $scope.items = [];

            for (var i = 0; dadosIniciais[i] !== undefined; i++) {
              $scope.items.push(dadosIniciais[i]);
            }
          }
          
          var quant_destroy = $scope.items.length - args.response.results.length;

          // popula os itens encontrados
          for (var i = 0; i <= args.response.results.length -1; i++) {
            $scope.items[i].description = args.response.results[i].item.description;
            $scope.items[i].id = args.response.results[i].item.id;
            $scope.items[i].image = args.response.results[i].item.image;
            $scope.items[i].resume = args.response.results[i].item.resume;
            $scope.items[i].title = args.response.results[i].item.title;
          }

          // destroi os itens desnecessarios
          while (quant_destroy > 0) {
            $scope.items.splice(-1, 1);
            quant_destroy--;
          }
        });

        // If the view is showing the detail, call showDetail
        if ($scope.items.length === 1) {
          $scope.isDetail = true;
          list.showDetail(0);
        } else if ($scope.isDetail) {
          list.showDetail();
        }

        // Remove the loading animation
        $scope.moblet.isLoading = false;

        $scope.$on("check-update-data", function(event, args) { 
            if ($scope.items.length < dadosIniciais.length) {
              $scope.items = JSON.parse(origData);
            }
        });
      },
      /**
       * Check if the view is showing a detail or the list. The function checks
       * if $stateParams.detail is set.
       * @return {boolean} True if the view must show a detail.
       */
      isDetail: function() {
        return $stateParams.detail !== "";
      },

      // Show the detail getting the index from $stateParams.detail. Set "item"
      // to the selected detail
      showDetail: function(detailIndex) {
        if (isDefined($stateParams.detail) && $stateParams.detail !== "") {
          var itemIndex = _.findIndex($scope.items, function(item) {
            if (item.id !== undefined) {
              return item.id.toString() === $stateParams.detail;
            } else {
              return;
            }
          });

          if (itemIndex === -1) {
            dataLoadOptions = {
              // offset: $scope.items === undefined ? 0 : $scope.items.length,
              items: 1000,
              cache: false
            };
            list.load(false, function() {
              list.showDetail();
            });
          } else {
            $stateParams.pageTitle = $scope.items[itemIndex].title;
            $scope.detail = $scope.items[itemIndex];
          }
        } else if (isDefined(detailIndex)) {
          $scope.detail = $scope.items[detailIndex];
        }
      },
      /**
       * Load data from the Moblets backend:
       * - show the page loader if it's called by init (sets showLoader to true)
       * - Use $mDataLoader.load to get the moblet data from Moblets backend.
       * 	 The parameters passed to $mDataLoader.load are:
       * 	 - $scope.moblet - the moblet created in the init function
       * 	 - false - A boolean that sets if you want to load data from the
       * 	   device storage or from the Moblets API
       * 	 - dataLoadOptions - An object with parameters for pagination
       * @param  {boolean} showLoader Boolean to determine if the page loader
       * is active
       * @param {function} callback Callback
       */
      load: function(showLoader, callback) {
        $scope.moblet.isLoading = showLoader || false;
        // Reset the pagination
        if (showLoader === true || showLoader === undefined) {
          dataLoadOptions.offset = 0;
        }
        // mDataLoader also saves the response in the local cache. It will be
        // used by the "showDetail" function
        $mDataLoader.load($scope.moblet, dataLoadOptions)
          .then(function(data) {
            list.setView(data);

            $rootScope.$broadcast('hide-search-refresh');

            dadosIniciais = JSON.stringify(data.items);
            dadosIniciais = JSON.parse(dadosIniciais);

            console.log(dadosIniciais, "dadosIniciais");

            if (typeof callback === 'function') {
              callback();
            }
          }
        );
      },
      /**
       * Load more data from the backend if there are more items.
       * - Update the offset summing the number of items
       - Use $mDataLoader.load to get the moblet data from Moblets backend.
       * 	 The parameters passed to $mDataLoader.load are:
       * 	 - $scope.moblet - the moblet created in the init function
       * 	 - false - A boolean that sets if you want to load data from the
       * 	   device storage or from the Moblets API
       * 	 - dataLoadOptions - An object with parameters for pagination
       */
      more: function() {
        // Add the items to the offset
        dataLoadOptions.offset += dataLoadOptions.items;
        $mDataLoader.load($scope.moblet, dataLoadOptions)
          .then(function(data) {
            list.setView(data, true);
          });
      },
      /**
       * Initiate the list moblet:
       * - put the list.load function in the $scope
       * - run list.load function
       */
      /*
       * TODO go to detail if url is called
       */
      init: function() {
        $stateParams.pageTitle = null;
        dataLoadOptions = {
          offset: 0,
          items: 1000,
          listKey: 'items',
          cache: false
        };
        $scope.load(true);
        $scope.reload = function() {
          list.load();
        };
      }
    };

    var listItem = {
      goTo: function(detail) {
        $stateParams.detail = detail.id;
        $mState.go('u-moblets', 'page', {
          detail: detail.id
        });
      }
    };

    $scope.stripHtml = function(str) {
      return str.replace(/<[^>]+>/ig, " ");
    };

    $scope.load = list.load;
    $scope.init = list.init;
    $scope.goTo = listItem.goTo;
    list.init();
  }
};
